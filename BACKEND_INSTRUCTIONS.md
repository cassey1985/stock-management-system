# Backend Server Instructions

## The Error You're Seeing
"Error: Failed to execute 'json' on 'Response': Unexpected end of JSON input"

This error means the backend server is not running. The frontend is trying to connect to http://localhost:3001 but there's no server responding.

## How to Fix It

### Option 1: Use the Batch File
1. Go to your project folder: `c:\Users\kasan\stock-management-system`
2. Double-click on `start-system.bat`
3. This will open two windows: one for backend, one for frontend

### Option 2: Manual Start
1. Open Command Prompt or PowerShell
2. Navigate to: `cd c:\Users\kasan\stock-management-system\server`
3. Run: `npx ts-node src/index.ts`
4. You should see: "Server running on port 3001"

### Option 3: VS Code Terminal
1. In VS Code, open a new terminal
2. Navigate to the server folder: `cd server`
3. Run: `npx ts-node src/index.ts`

## What Should Happen
- Backend server starts on http://localhost:3001
- Frontend is already running on http://localhost:5174
- Delete functionality will work once both servers are running

## Test Backend is Working
Open your browser to: http://localhost:3001/api/health
You should see: {"status":"OK","timestamp":"..."}
