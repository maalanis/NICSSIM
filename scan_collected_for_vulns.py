#!/usr/bin/env python3
"""
scan_collected_for_vulns.py

Usage:
    python scan_collected_for_vulns.py output/collected_001.txt \
        --out security_scan.jsonl \
        --model gpt-5.1
"""

import argparse
import json
from pathlib import Path
from typing import Iterator, Tuple

from openai import OpenAI


# ---------- 1. Parse collected_XXX.txt ----------

def iter_collected_entries(collected_file: str) -> Iterator[Tuple[str, str]]:
    """
    Stream over (file_path, content) entries inside a collected_XXX.txt file.

    The format is:

        (relative/path/to/file.ext)
        ...file contents...

        (another/file.ext)
        ...file contents...
    """
    header = None
    buf_lines = []

    with open(collected_file, "r", encoding="utf-8", errors="ignore") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")

            # New file header: "(some/path/file.ext)"
            if line.startswith("(") and line.endswith(")"):
                if header is not None:
                    # Flush previous entry
                    yield header, "\n".join(buf_lines).rstrip() + "\n"
                header = line.strip()[1:-1]  # strip parentheses
                buf_lines = []
            else:
                buf_lines.append(raw_line.rstrip("\n"))

        # Flush last entry at EOF
        if header is not None:
            yield header, "\n".join(buf_lines).rstrip() + "\n"


def add_line_numbers(text: str, max_chars: int = 25_000) -> str:
    """
    Truncate long files and prefix each line with a 4-digit line number.
    This keeps prompts under control for huge files.
    """
    truncated = text[:max_chars]
    lines = truncated.splitlines()
    return "\n".join(f"{i+1:04}: {line}" for i, line in enumerate(lines))


# ---------- 2. Prompt construction ----------

def build_prompt(file_path: str, content: str) -> str:
    numbered = add_line_numbers(content)

    # We show the *shape* of the JSON we want (with example values).
    schema_example = """
Return a SINGLE JSON object with exactly these keys and value types.
Do NOT include comments or trailing commas.
Do NOT wrap the JSON in markdown (no ``` fences).

Example of the shape (values are illustrative):

{
  "file_path": "NICSSIM UI Design/src/index.css",
  "language": "css",
  "file_risk_percent": 42,
  "issues": [
    {
      "id": "ISSUE-1",
      "title": "SQL injection vulnerability in reactor query endpoint",
      "cwe": "CWE-89",
      "severity": "critical",
      "likelihood": "high",
      "risk_percent": 90,
      "description": "Direct string concatenation is used to build a SQL query with user-controlled input.",
      "recommendation": "Use parameterized queries / prepared statements and validate input.",
      "start_line": 10,
      "end_line": 22,
      "vulnerable_code": "string containing the vulnerable code block",
      "fixed_code": "string containing the secure, fixed version of the code"
    }
  ]
}
""".strip()

    return f"""
Analyze this source file for security vulnerabilities.

File path: {file_path}

Your job:

1. Estimate how vulnerable this file is overall (0-100 where
   0 = no obvious issues, 100 = extremely vulnerable).
2. List each distinct vulnerability you find with:
   - human-readable title and description
   - best-guess CWE
   - severity and likelihood
   - the exact line range where the problem appears
   - a short code snippet showing the vulnerable code
   - a fixed version of that snippet

{schema_example}

If there are no meaningful security issues, set "file_risk_percent" to 0
and return an empty "issues" array.

Focus on issues that are realistically exploitable, especially:
- injection (SQL, command, LDAP, template, etc.)
- authentication / authorization problems
- unsafe deserialization or dynamic eval
- insecure randomness and cryptography
- hard-coded secrets
- missing input validation and sanitization
- insecure file or network access

Here is the file with line numbers:

{numbered}
""".strip()


# ---------- 3. Call the model ----------

def scan_file(client: OpenAI, model: str, file_path: str, content: str) -> dict:
    prompt = build_prompt(file_path, content)

    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are a strict secure code review engine for a nuclear reactor "
                    "simulation platform. Always respond with a single valid JSON object "
                    "and nothing else."
                ),
            },
            {"role": "user", "content": prompt},
        ],
    )

    # All the JSON should be in this text field
    text = response.output_text
    return json.loads(text)


# ---------- 4. Entry point ----------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Scan a collected_XXX.txt file for vulnerabilities using an LLM."
    )
    parser.add_argument("collected_file", help="Path to collected_XXX.txt")
    parser.add_argument(
        "--out",
        default="security_scan.jsonl",
        help="Where to write per-file JSON results (one object per line)",
    )
    parser.add_argument(
        "--model",
        default="gpt-5.1",
        help="OpenAI model ID (e.g. gpt-5.1, gpt-5-mini, gpt-4.1-mini, ...)",
    )
    args = parser.parse_args()

    client = OpenAI()

    with open(args.out, "w", encoding="utf-8") as out_f:
        for file_path, content in iter_collected_entries(args.collected_file):
            # Skip the collected output files themselves to avoid recursion
            if "output/collected_" in file_path:
                continue

            # Optional: only scan code/infra files, not lockfiles, images, etc.
            ext = Path(file_path).suffix.lower()
            if ext not in {
                ".py",
                ".ts", ".tsx", ".js", ".jsx", ".mjs",
                ".c", ".cpp", ".cs", ".java", ".go", ".rs",
                ".php", ".rb",
                ".html", ".css",
                ".sql",
                ".yaml", ".yml",
                ".json",  # sometimes security issues hide in configs
            }:
                continue

            try:
                analysis = scan_file(client, args.model, file_path, content)
            except Exception as e:
                print(f"[!] Failed on {file_path}: {e}")
                continue

            # Ensure file_path is present even if the model forgets to echo it
            analysis.setdefault("file_path", file_path)

            out_f.write(json.dumps(analysis))
            out_f.write("\n")
            print(f"[✓] Scanned {file_path}")


if __name__ == "__main__":
    main()
