from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


def main() -> int:
    commands = [
        (
            "Frontend",
            [sys.executable, "-m", "http.server", "8000"],
            ROOT / "student",
        ),
        (
            "Backend",
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                "8001",
            ],
            ROOT / "backend",
        ),
    ]

    processes: list[tuple[str, subprocess.Popen[bytes]]] = []
    try:
        for name, command, working_directory in commands:
            process = subprocess.Popen(command, cwd=working_directory)
            processes.append((name, process))

        print()
        print("PathPilot AI is running.")
        print("Frontend: http://localhost:8000")
        print("API:      http://localhost:8001")
        print("API docs: http://localhost:8001/docs")
        print("Press Ctrl+C to stop both services.")
        print()

        while True:
            for name, process in processes:
                exit_code = process.poll()
                if exit_code is not None:
                    print(f"{name} stopped unexpectedly with exit code {exit_code}.")
                    return exit_code or 1
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping PathPilot AI...")
        return 0
    finally:
        for _, process in processes:
            stop_process(process)


if __name__ == "__main__":
    raise SystemExit(main())
