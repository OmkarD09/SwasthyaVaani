import glob
import os
import re

log_dir = r"C:\Users\ACER\.gemini\antigravity-ide\brain\0d48d249-aef4-4d23-9985-936b0be6ccad\.system_generated\tasks"
log_files = glob.glob(os.path.join(log_dir, "*.log"))

print(f"Total log files: {len(log_files)}")

keywords = ["429", "500", "503", "rate limit", "Groq", "Gemini", "Sarvam", "speech", "extract_clinical_facts", "saaras", "bulbul", "qwen", "POST /api/v1/intakes", "POST /api/v1/speech", "95347aaf", "b0e45cb2", "0524ea70", "dbc3ad57"]

for lf in sorted(log_files, key=os.path.getmtime):
    size = os.path.getsize(lf)
    if size == 0:
        continue
    try:
        with open(lf, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            matches = [kw for kw in keywords if kw.lower() in content.lower()]
            if matches:
                print(f"\n=======================================================")
                print(f"File: {os.path.basename(lf)} (Size: {size} bytes, MTime: {os.path.getmtime(lf)})")
                print(f"Matched keywords: {matches}")
                # Print relevant snippet lines
                lines = content.splitlines()
                for line in lines:
                    if any(kw.lower() in line.lower() for kw in ["error", "warning", "429", "500", "502", "503", "timeout", "rate", "fallback", "sarvam", "groq", "gemini", "intakes"]):
                        print(f"  {line[:150]}")
    except Exception as e:
        print(f"Error reading {lf}: {e}")
