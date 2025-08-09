# Stock Management System - Backup & Restore Guide

This backup system allows you to create timestamped backups of your entire Stock Management System and easily restore them when needed.

## 🔧 Available Scripts

### 1. `backup.ps1` - Standard Backup
Creates a full backup of your project (excludes node_modules, dist, build, .git).

```powershell
# Basic backup
.\backup.ps1

# Backup with descriptive note
.\backup.ps1 -BackupNote "working-navigation-fixed"

# Backup to custom location
.\backup.ps1 -BackupPath "D:\MyBackups" -BackupNote "before-new-feature"
```

### 2. `backup-improved.ps1` - Enhanced Backup (Recommended)
Uses robocopy for better Windows path handling and faster copying.

```powershell
# Enhanced backup (handles long paths better)
.\backup-improved.ps1 -BackupNote "stable-version"
```

### 3. `quick-backup.ps1` - One-Click Backup
Simple script for quick backups.

```powershell
# Quick backup with note
.\quick-backup.ps1 "before-edit-function"

# Quick backup with default name
.\quick-backup.ps1
```

### 4. `restore.ps1` - Restore System
Restores your project from a backup (creates safety backup first).

```powershell
# Restore from specific backup
.\restore.ps1 -BackupPath "C:\Users\kasan\stock-backups\stock-management-system_backup_2025-08-06_11-07-39_working-system-navigation-fixed"

# Force restore without confirmation
.\restore.ps1 -BackupPath "C:\path\to\backup" -Force
```

### 5. `list-backups.ps1` - View Available Backups
Lists all available backups with details.

```powershell
# List all backups
.\list-backups.ps1

# List backups from custom location
.\list-backups.ps1 -BackupPath "D:\MyBackups"
```

## 📂 Backup Structure

Backups are stored in: `C:\Users\kasan\stock-backups\`

### Backup Naming Convention:
```
stock-management-system_backup_YYYY-MM-DD_HH-MM-SS_[note]
```

Example: `stock-management-system_backup_2025-08-06_11-07-39_working-system-navigation-fixed`

### What's Included:
✅ Source code (`src/`, `server/src/`)
✅ Configuration files (`package.json`, `vite.config.ts`, etc.)
✅ Environment files (`.env.*`)
✅ Documentation files
✅ All custom scripts

### What's Excluded:
❌ `node_modules/` (will be reinstalled)
❌ `dist/` and `build/` folders
❌ `.git/` folder
❌ IDE files (`.vscode/`)
❌ Coverage reports

### Backup Information:
Each backup includes a `backup-info.json` file with:
- Creation date and time
- Backup note/description
- Backup size
- Excluded folders list
- Original project path

## 🔄 Common Workflows

### Before Making Changes:
```powershell
# Create a backup before making any changes
.\backup-improved.ps1 -BackupNote "before-new-feature"
```

### After Successful Changes:
```powershell
# Create a backup of the working version
.\backup-improved.ps1 -BackupNote "feature-completed"
```

### When Something Breaks:
```powershell
# 1. List available backups
.\list-backups.ps1

# 2. Restore from the last known good backup
.\restore.ps1 -BackupPath "C:\Users\kasan\stock-backups\[backup-folder-name]"

# 3. Reinstall dependencies
npm install
cd server && npm install

# 4. Start the servers
npm run dev
```

## ⚡ Current Working Backup

✅ **Latest Backup Created**: `stock-management-system_backup_2025-08-06_11-07-39_working-system-navigation-fixed`
- **Status**: System working with navigation fully fixed
- **Size**: ~411 MB
- **Features**: All navigation working, authentication system, FIFO inventory, customer debts, payments

## 🚨 Emergency Restore

If your system is completely broken:

```powershell
# Quick restore from the working backup
.\restore.ps1 -BackupPath "C:\Users\kasan\stock-backups\stock-management-system_backup_2025-08-06_11-07-39_working-system-navigation-fixed" -Force

# Reinstall dependencies
npm install
cd server && npm install

# Start servers
npm run dev
```

## 💡 Best Practices

1. **Create backups before major changes**
2. **Use descriptive backup notes**
3. **Keep multiple backup versions**
4. **Test restore process occasionally**
5. **Clean up old backups periodically**

## 🔧 Troubleshooting

### Long Path Errors:
Use `backup-improved.ps1` instead of `backup.ps1`

### Backup Too Large:
Backups exclude node_modules but may still be large due to nested dependencies in server/node_modules. This is normal.

### Restore Fails:
1. Check if backup path exists
2. Ensure you have write permissions
3. Close VS Code and any running servers before restore
4. Use `-Force` parameter to skip confirmation

### After Restore:
Always run these commands after restoring:
```powershell
npm install          # Install frontend dependencies
cd server
npm install          # Install backend dependencies
cd ..
npm run dev          # Start both servers
```

## 📞 Need Help?

If you encounter issues with the backup system, check:
1. PowerShell execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
2. Available disk space
3. File permissions
4. Path length limitations (use backup-improved.ps1)
