// server/save-config.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
app.use(cors()); // allow Vite on :3000
app.use(express.json({ limit: "10mb" }));

// ---- paths & helpers ----
const rootDir = process.cwd();
const deploymentsDir = path.join(rootDir, "deployments");
const currSimDir = path.join(deploymentsDir, "currSim");
const pastSimDir = path.join(deploymentsDir, "pastSim");
const logsDir = path.join(deploymentsDir, "logs");

async function ensureDirs() {
  await fsp.mkdir(deploymentsDir, { recursive: true });
  await fsp.mkdir(currSimDir, { recursive: true });
  await fsp.mkdir(pastSimDir, { recursive: true });
  await fsp.mkdir(logsDir, { recursive: true });
}

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" + pad(d.getMonth() + 1) +
    "-" + pad(d.getDate()) +
    "_" + pad(d.getHours()) +
    "-" + pad(d.getMinutes()) +
    "-" + pad(d.getSeconds())
  );
}

function computeFleetAndPlcUniform(payload) {
  const fleet = Number(payload?.project?.reactorCount) || 1;
  const reactors = Array.isArray(payload?.reactors) ? payload.reactors : [];
  if (reactors.length === 0) return { fleet, plcUniform: 1 };

  let sum = 0;
  for (const r of reactors) {
    if (typeof r?.plcCount === "number") sum += r.plcCount;
    else if (Array.isArray(r?.plcs)) sum += r.plcs.length || 1;
    else sum += 1;
  }
  const plcUniform = Math.floor(sum / reactors.length) || 1;
  return { fleet, plcUniform };
}

// ---- simple save endpoint (kept for compatibility) ----
app.post("/save-config", async (req, res) => {
  try {
    const { filename, payload } = req.body || {};
    if (!filename || !payload) return res.status(400).send("Missing filename or payload");
    await ensureDirs();
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    const out = path.join(deploymentsDir, safe);
    await fsp.writeFile(out, JSON.stringify(payload, null, 2), "utf8");
    return res.status(200).send(`Saved to deployments/${safe}`);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Internal error");
  }
});

// ---- live log streaming (SSE) ----
/** Simple in-memory registry of SSE clients per log file */
const sseClients = new Map(); // key: logPath, value: Set<res>

function broadcastLine(logPath, line) {
  const set = sseClients.get(logPath);
  if (!set) return;
  for (const res of set) {
    res.write(`data: ${line}\n\n`);
  }
}

app.get("/deploy-logs/stream", async (req, res) => {
  const logPath = req.query.log;
  if (!logPath) return res.status(400).end("Missing ?log=");

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send a hello
  res.write(`event: hello\ndata: streaming ${logPath}\n\n`);

  let set = sseClients.get(logPath);
  if (!set) {
    set = new Set();
    sseClients.set(logPath, set);
  }
  set.add(res);

  req.on("close", () => {
    set.delete(res);
    if (set.size === 0) sseClients.delete(logPath);
  });
});

// ---- deploy endpoint: saves config, archives previous, spawns init.sh and logs ----
app.post("/deploy-sim", async (req, res) => {
  try {
    const { payload } = req.body || {};
    if (!payload) return res.status(400).json({ error: "Missing payload" });
    await ensureDirs();

    // Archive old config
    const configPath = path.join(currSimDir, "config.json");
    if (fs.existsSync(configPath)) {
      const archived = path.join(pastSimDir, `config-${ts()}.json`);
      await fsp.rename(configPath, archived);
    }

    // Write new config
    await fsp.writeFile(configPath, JSON.stringify(payload, null, 2), "utf8");

    // Compute args for init.sh
    const { fleet, plcUniform } = computeFleetAndPlcUniform(payload);

    // Prepare log file for this run
    const logFile = path.join(logsDir, `deploy-${ts()}.log`);
    const outStream = fs.createWriteStream(logFile, { flags: "a" });

    // Make init.sh executable
    const initPath = path.join(deploymentsDir, "init.sh");
    try { await fsp.chmod(initPath, 0o755); } catch (_) {}

    // Spawn the process (not detached so Node can capture output), but we return immediately
    const child = spawn("bash", [initPath, String(fleet), String(plcUniform)], {
      cwd: rootDir,
      env: process.env,
    });

    // Prefix helper
    const stampLine = (type, chunk) =>
      chunk.toString().split(/\r?\n/).filter(Boolean).map(l => `[${type}] ${l}`).join("\n") + "\n";

    child.stdout.on("data", (chunk) => {
      const line = stampLine("OUT", chunk);
      outStream.write(line);
      broadcastLine(logFile, line);
      process.stdout.write(line); // also mirror to server console
    });

    child.stderr.on("data", (chunk) => {
      const line = stampLine("ERR", chunk);
      outStream.write(line);
      broadcastLine(logFile, line);
      process.stderr.write(line);
    });

    child.on("close", (code) => {
      const endMsg = `[DONE] init.sh exited with code ${code}\n`;
      outStream.write(endMsg);
      broadcastLine(logFile, endMsg);
      outStream.end();
    });

    // Return immediately with metadata (UI can connect to log stream)
    return res.status(202).json({
      ok: true,
      saved: "deployments/currSim/config.json",
      fleet,
      plcUniform,
      pid: child.pid,
      logPath: logFile, // absolute path
      message: "Deployment started",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
});

const PORT = process.env.SAVE_PORT || 4545;
app.listen(PORT, () => console.log(`Save server -> http://localhost:${PORT}`));
