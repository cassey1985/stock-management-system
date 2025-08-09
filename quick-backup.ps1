# Quick Backup Script - Creates backup with current working state
# Usage: .\quick-backup.ps1 "working-navigation-fixed"

param(
    [string]$Note = "quick-backup"
)

Write-Host "🚀 Creating quick backup..." -ForegroundColor Green
& ".\backup.ps1" -BackupNote $Note
