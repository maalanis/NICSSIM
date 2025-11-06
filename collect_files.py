#!/usr/bin/env python3
"""
split_collector.py

Recursively collect project files and append their contents into chunked output
files (~20 MB each) inside an 'output' folder.

Included:
  - Code/docs: .py, .txt, .sh, .json, .ts, .tsx, .mjs, .css, .config.ts
  - Env files: *.env (e.g., rx003.env) and *.env.template
  - YAML: .yml, .yaml
  - Docker Compose: docker-compose.yml/yaml, compose.yml/yaml, *.compose.yml/yaml

Excluded directories:
  .git, node_modules, .venv, __pycache__

Usage:
    python3 split_collector.py [ROOT [ROOT2 ...]]
If no ROOT is given, uses the current directory.
"""

import os
import sys
from pathlib import Path

# === SETTINGS ===
MAX_MB = 20
MAX_BYTES = MAX_MB * 1024 * 1024
OUTDIR = "output"
PREFIX = "collected"
EXT = "txt"

EXCLUDED_DIRS = {".git", "node_modules", ".venv", "__pycache__"}

# File extensions we want, normalized lower-case
INCLUDED_EXTS = {
    ".py", ".txt", ".sh",
    ".env", ".yml", ".yaml",
    ".json", ".ts", ".tsx", ".mjs", ".css",
    ".config.ts",
}

# Compose filenames/patterns we want to force-include
COMPOSE_BASENAMES = {
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
}
COMPOSE_SUFFIXES = (".compose.yml", ".compose.yaml")

# Env templates (common pattern)
ENV_TEMPLATE_SUFFIXES = (".env.template",)

# === HELPERS ===
def is_binary(path: Path, chunk_size: int = 1024) -> bool:
    """
    Heuristic: if the first chunk contains a null byte, treat as binary.
    """
    try:
        with path.open("rb") as f:
            chunk = f.read(chunk_size)
        return b"\x00" in chunk
    except Exception:
        # If we can't read the file for some reason, skip it
        return True

def should_exclude_dir(dirname: str) -> bool:
    return dirname in EXCLUDED_DIRS

def include_by_name(p: Path) -> bool:
    """
    Decide inclusion based on file name and extension.
    """
    name = p.name
    lower = name.lower()
    ext = ''.join(Path(lower).suffixes[-1:]) if '.' in lower else ''

    # Fast-path: explicit compose basenames
    if lower in COMPOSE_BASENAMES:
        return True

    # Compose suffixes like reactor.compose.yml / service.compose.yaml
    if lower.endswith(COMPOSE_SUFFIXES):
        return True

    # Env templates: e.g., reactor.env.template
    if lower.endswith(ENV_TEMPLATE_SUFFIXES):
        return True

    # Extension-based allowlist
    # Handle special multi-suffix like ".config.ts"
    if lower.endswith(".config.ts"):
        return True

    # Normal single suffix extensions
    if p.suffix.lower() in INCLUDED_EXTS:
        return True

    return False

def write_chunked(outputs_dir: Path, prefix: str, ext: str, entries_iter):
    outputs_dir.mkdir(parents=True, exist_ok=True)
    idx = 1
    bytes_written = 0
    out_path = outputs_dir / f"{prefix}_{idx:03d}.{ext}"
    out_file = out_path.open("w", encoding="utf-8", errors="replace")

    def roll():
        nonlocal idx, bytes_written, out_file, out_path
        out_file.close()
        idx += 1
        bytes_written = 0
        out_path = outputs_dir / f"{prefix}_{idx:03d}.{ext}"
        out_file = out_path.open("w", encoding="utf-8", errors="replace")

    for header, content in entries_iter:
        entry = f"({header})\n{content}\n\n"
        if bytes_written + len(entry.encode("utf-8", errors="replace")) > MAX_BYTES:
            roll()
        out_file.write(entry)
        bytes_written += len(entry.encode("utf-8", errors="replace"))

    out_file.close()

def iter_entries(roots):
    """
    Yield (header, content) for each included file.
    The header is the relative path from the working directory.
    """
    cwd = Path.cwd()
    seen = set()  # prevent duplicates if overlapping roots

    for root in roots:
        root = Path(root).resolve()
        if not root.exists():
            continue

        for dirpath, dirnames, filenames in os.walk(root):
            # prune excluded dirs in-place
            dirnames[:] = [d for d in dirnames if not should_exclude_dir(d)]

            for fname in filenames:
                p = Path(dirpath) / fname
                try:
                    rel = p.relative_to(cwd)
                except Exception:
                    # if file is outside cwd, just use absolute
                    rel = p

                # skip duplicates
                key = str(p.resolve())
                if key in seen:
                    continue

                if not include_by_name(p):
                    continue

                if is_binary(p):
                    continue

                try:
                    content = p.read_text(encoding="utf-8", errors="replace")
                except Exception:
                    # unreadable: skip
                    continue

                seen.add(key)
                yield (str(rel), content)

def main():
    roots = sys.argv[1:] if len(sys.argv) > 1 else ["."]
    entries = iter_entries(roots)
    write_chunked(Path(OUTDIR), PREFIX, EXT, entries)

if __name__ == "__main__":
    main()
