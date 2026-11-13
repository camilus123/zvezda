@echo off
rem Rebuilds dist\app.js and zvezda.html after editing files in src\ (needs Node.js; run "npm install" once first).
cd /d "%~dp0"
call npm run build
