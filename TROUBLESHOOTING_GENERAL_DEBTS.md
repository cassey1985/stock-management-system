# 🔧 TROUBLESHOOTING GUIDE: General Debts "Not Found" Error

## 📊 Issue Diagnosed
The "API request failed: Not Found" error typically indicates that the backend server is not running or accessible.

## 🚀 SOLUTION STEPS:

### 1️⃣ **Start the Backend Server**
Open a terminal and run one of these commands:

```bash
# Option 1: Start both frontend and backend together
npm run dev:all

# Option 2: Start backend only (in a separate terminal)
cd server
npm run dev

# Option 3: Start backend from root directory
npm run dev:server
```

### 2️⃣ **Verify Server is Running**
You should see output like:
```
Server running on port 3001
```

### 3️⃣ **Check Browser Console**
After starting the server:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Navigate to General Debts page
4. Look for these messages:
   - ✅ "Server is running"
   - ✅ "General debts fetched successfully"

### 4️⃣ **Test Server Health**
Open your browser and go to:
```
http://localhost:3001/api/health
```
You should see: `{"status":"OK","timestamp":"..."}`

### 5️⃣ **Test General Debts Endpoint**
Once server is running, test:
```
http://localhost:3001/api/general-debts
```
You should see JSON data with sample debts.

## 🔍 **Enhanced Debugging Added**

I've added debugging logs to help identify the issue:

### **Console Logs to Watch For:**
- "Checking server health..."
- "Server is running" ✅ (Good)
- "Server health check failed" ❌ (Server not running)
- "API call to: http://localhost:3001/api/general-debts"
- "General debts fetched successfully" ✅ (Working)

## 🛠 **Common Issues & Solutions:**

### **Issue 1: Server Not Started**
**Symptoms:** "Backend server is not running" error
**Solution:** Run `npm run dev:all` or `npm run dev:server`

### **Issue 2: Wrong Port**
**Symptoms:** Connection refused
**Solution:** Verify server is running on port 3001

### **Issue 3: CORS Issues**
**Symptoms:** CORS policy error in console
**Solution:** Server already has CORS enabled, restart server

### **Issue 4: Missing Dependencies**
**Symptoms:** Module not found errors
**Solution:** Run `npm install` in both root and server directories

## 📋 **Step-by-Step Startup Process:**

1. **Install Dependencies (if not done):**
   ```bash
   npm run install:all
   ```

2. **Start the Application:**
   ```bash
   npm run dev:all
   ```

3. **Verify Both Services:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001/api/health

4. **Navigate to General Debts:**
   - Click "🏦 General Debts" in sidebar
   - Or use Dashboard Quick Action

## 🎯 **Expected Behavior After Fix:**

Once the server is running, you should see:
- **Summary Cards** with debt totals
- **Tabs** for All/Payables/Receivables
- **Sample Data** including:
  - Rice supplier debt (₱10,000)
  - Electricity bill (₱2,500)
  - Business loan (₱8,000)
  - Personal loans and advances

## 🆘 **If Still Not Working:**

1. **Check Server Terminal** for error messages
2. **Verify Port 3001** is not used by another application
3. **Restart VS Code** and try again
4. **Check package.json** scripts are correct

## ✅ **Quick Verification:**
After starting the server, the General Debts page should load with sample data and no error messages. The debugging console will show successful API calls.

**The system is fully functional - it just needs the backend server to be running!**
