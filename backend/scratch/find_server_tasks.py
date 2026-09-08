import glob, os

log_dir = r"C:\Users\ACER\.gemini\antigravity-ide\brain\0d48d249-aef4-4d23-9985-936b0be6ccad\.system_generated\tasks"
log_files = glob.glob(os.path.join(log_dir, "*.log"))

server_tasks = []
for lf in log_files:
    if os.path.getsize(lf) == 0 or os.path.getsize(lf) > 500000:
        continue
    with open(lf, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()
        if "uvicorn" in text.lower() or "fastapi" in text.lower() or "application startup complete" in text.lower() or "http/1.1" in text.lower():
            server_tasks.append((os.path.basename(lf), os.path.getmtime(lf), os.path.getsize(lf), text))

print(f"Found {len(server_tasks)} server log files.")
for name, mtime, size, text in sorted(server_tasks, key=lambda x: x[1]):
    print(f"\n=======================================================")
    print(f"Server Task: {name} (size={size}, mtime={mtime})")
    lines = text.splitlines()
    print(f"Total lines: {len(lines)}")
    # Print lines that mention HTTP requests, errors, or provider info
    for line in lines[-40:]:
        print("  ", line)
