@echo off
echo ========================================
echo COMPLETE RESTART - Frontend + Backend
echo ========================================
echo.

echo [1/5] Stopping all processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
echo     Python processes stopped
echo     Node processes stopped

echo.
echo [2/5] Waiting for ports to be released...
timeout /t 5 /nobreak >nul
echo     Ports released

echo.
echo [3/5] Starting backend...
cd /d "%~dp0backend"
start "Smart Campus Backend" cmd /k "venv\Scripts\python start_server.py"

echo     Backend starting...

echo.
echo [3.5/5] Checking Database...
if not exist "campus.db" (
    if not exist "analytics.db" (
         echo     Initializing Database...
         venv\Scripts\python init_db_manual.py
    )
)


echo.
echo [4/5] Waiting for backend to initialize...
timeout /t 8 /nobreak >nul
echo     Backend ready

echo.
echo [5/5] Starting frontend...
cd /d "%~dp0frontend"
start "Smart Campus Frontend" cmd /k "npm run dev"
echo     Frontend starting...

echo.
echo ========================================
echo ✅ COMPLETE RESTART DONE!
echo ========================================
echo.
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Wait 10 seconds, then open: http://localhost:5173
echo.
echo Press any key to close this window...
pause >nul
