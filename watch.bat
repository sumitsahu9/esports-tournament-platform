@echo off
title Mash Arena - Real-Time Live Watcher
echo Starting Mash Arena Auto-Watcher...
set PATH=C:\Users\intel\.gemini\antigravity\scratch\.node\node-v20.11.0-win-x64;%%PATH%%
node watch_deploy.js
pause
