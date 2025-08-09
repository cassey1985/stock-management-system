# Stock Management System Restore Script
# This script restores a backup of your project

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath,
    [switch]$Force = $false
)

$sourceFolder = "C:\Users\kasan\stock-management-system"

# Validate backup path
if (!(Test-Path $BackupPath)) {
    Write-Error "❌ Backup path does not exist: $BackupPath"
    exit 1
}

# Check if backup-info.json exists
$backupInfoPath = Join-Path $BackupPath "backup-info.json"
if (Test-Path $backupInfoPath) {
    $backupInfo = Get-Content $backupInfoPath | ConvertFrom-Json
    Write-Host "📋 Backup Information:" -ForegroundColor Cyan
    Write-Host "   Date: $($backupInfo.BackupDate)" -ForegroundColor Gray
    Write-Host "   Size: $($backupInfo.BackupSize)" -ForegroundColor Gray
    Write-Host "   Note: $($backupInfo.BackupNote)" -ForegroundColor Gray
}

Write-Host "`n⚠️  WARNING: This will replace your current project!" -ForegroundColor Red
Write-Host "Current project location: $sourceFolder" -ForegroundColor Yellow
Write-Host "Backup source: $BackupPath" -ForegroundColor Yellow

if (!$Force) {
    $confirm = Read-Host "`nDo you want to continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host "`nCreating safety backup of current state..." -ForegroundColor Yellow
$safetyBackupName = "safety_backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')"
$safetyBackupPath = "C:\Users\kasan\stock-backups\$safetyBackupName"

if (Test-Path $sourceFolder) {
    try {
        # Create safety backup directory
        New-Item -ItemType Directory -Path $safetyBackupPath -Force | Out-Null
        
        # Copy current state (excluding node_modules)
        $excludeFolders = @("node_modules", "dist", "build", ".git", "coverage")
        Get-ChildItem -Path $sourceFolder -Force | Where-Object {
            $_.Name -notin $excludeFolders
        } | ForEach-Object {
            if ($_.PSIsContainer) {
                Copy-Item -Path $_.FullName -Destination $safetyBackupPath -Recurse -Force
            } else {
                Copy-Item -Path $_.FullName -Destination $safetyBackupPath -Force
            }
        }
        Write-Host "✅ Safety backup created at: $safetyBackupPath" -ForegroundColor Green
    } catch {
        Write-Warning "⚠️  Could not create safety backup: $($_.Exception.Message)"
    }
}

Write-Host "`nRestoring from backup..." -ForegroundColor Yellow

try {
    # Remove existing project files (except node_modules for faster restore)
    if (Test-Path $sourceFolder) {
        Get-ChildItem -Path $sourceFolder -Force | Where-Object {
            $_.Name -notin @("node_modules", ".git")
        } | Remove-Item -Recurse -Force
    } else {
        New-Item -ItemType Directory -Path $sourceFolder -Force | Out-Null
    }

    # Copy backup files
    Get-ChildItem -Path $BackupPath -Force | Where-Object {
        $_.Name -ne "backup-info.json"
    } | ForEach-Object {
        Write-Host "Restoring: $($_.Name)" -ForegroundColor Cyan
        if ($_.PSIsContainer) {
            Copy-Item -Path $_.FullName -Destination $sourceFolder -Recurse -Force
        } else {
            Copy-Item -Path $_.FullName -Destination $sourceFolder -Force
        }
    }

    Write-Host "`n✅ Restore completed successfully!" -ForegroundColor Green
    Write-Host "📁 Project restored to: $sourceFolder" -ForegroundColor Green
    Write-Host "🔒 Safety backup saved at: $safetyBackupPath" -ForegroundColor Green
    Write-Host "`n💡 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Run: npm install (to restore dependencies)" -ForegroundColor White
    Write-Host "   2. Start servers: npm run dev" -ForegroundColor White

} catch {
    Write-Error "❌ Restore failed: $($_.Exception.Message)"
    Write-Host "🔒 Your safety backup is available at: $safetyBackupPath" -ForegroundColor Yellow
    exit 1
}
