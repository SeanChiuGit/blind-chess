@echo off
cd /d "D:\My projects\new-no-king-chess"
start http://localhost:8000
python -m http.server 8000
pause