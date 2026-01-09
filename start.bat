@echo off
echo Starting Turbo Transfer Native Workflow...

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it to build the frontend.
    pause
    exit /b
)

:: Build Frontend
echo Building Frontend...
cd frontend
call npm install
call npm run build
cd ..

:: Check for Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed.
    pause
    exit /b
)

:: Install Backend Requirements
echo Installing Backend Requirements...
pip install -r backend/requirements.txt

:: Start Backend
echo Starting Backend...
cd backend
python main.py

pause
