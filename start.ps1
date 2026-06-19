$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "PathPilot AI is starting..." -ForegroundColor Cyan
Write-Host "Open http://localhost:8000 in your browser." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor DarkGray
Write-Host ""

python -m http.server 8000 --directory $projectRoot
