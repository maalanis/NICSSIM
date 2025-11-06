#!/usr/bin/env python3
"""
send_to_chatgpt.py

Uploads a file and starts a conversation with ChatGPT
using the new Responses API (OpenAI SDK v2+).

Usage:
    python3 send_to_chatgpt.py output/collected_001.txt
"""

import os
import sys
from openai import OpenAI

MODEL = "gpt-4o-mini"   # or "gpt-4o" for deeper analysis

def main():
    if len(sys.argv) < 2:
        print("❌ Usage: python3 send_to_chatgpt.py <path_to_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        sys.exit(1)

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # === 1. Upload file ===
    print(f"📤 Uploading file: {file_path}")
    uploaded_file = client.files.create(
        file=open(file_path, "rb"),
        purpose="assistants"  # still the correct purpose for chat references
    )
    print(f"✅ Uploaded with ID: {uploaded_file.id}")

    # === 2. Send to ChatGPT via Responses API ===
    print("💬 Sending message to ChatGPT (Responses API)...")

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are an expert software engineer analyzing source code."},
            {"role": "user", "content": [
                {"type": "text", "text": "Here is my project file. Summarize what this code does and describe its overall structure."},
                {"type": "file", "file_id": uploaded_file.id}
            ]}
        ],
    )

    # === 3. Display result ===
    print("\n🧩 ChatGPT’s reply:\n")
    print(response.choices[0].message.content[0].text.value)

if __name__ == "__main__":
    main()
