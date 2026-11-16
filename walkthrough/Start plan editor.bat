@echo off
rem Starts the local server and opens the plan editor.
rem Keep this window open while you edit: it is what saves your changes
rem into js\plan-data.js. Close it when you are done.
cd /d "%~dp0"
start "" "http://localhost:8765/editor.html"
python serve.py 8765
if errorlevel 1 (
  echo.
  echo The server did not start. If it says the address is already in use,
  echo another copy is already running and the editor page will still work.
  pause
)
