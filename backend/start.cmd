@echo off
cd /d "%~dp0"
echo.
echo PathPilot AI API is starting...
echo API:  http://localhost:8001
echo Docs: http://localhost:8001/docs
echo Press Ctrl+C to stop the server.
echo.
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
