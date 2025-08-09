# Stock Management System Backup Script
# This script creates a timestamped backup of your entire project

param(
    [string]$BackupPath = "C:\Users\kasan\stock-backups",
    [string]$BackupNote = ""
)

# Get current timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$projectName = "stock-management-system"
$backupName = "${projectName}_backup_${timestamp}"

if ($BackupNote -ne "") {
    $backupName += "_$($BackupNote -replace '[^\w\-_]', '_')"
}

$backupFullPath = Join-Path $BackupPath $backupName

Write-Host "Creating backup: $backupName" -ForegroundColor Green
Write-Host "Backup location: $backupFullPath" -ForegroundColor Yellow

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "Created backup directory: $BackupPath" -ForegroundColor Cyan
}

# Create the specific backup folder
New-Item -ItemType Directory -Path $backupFullPath -Force | Out-Null

# Copy all files except node_modules and other unnecessary folders
$excludeFolders = @("node_modules", "dist", "build", ".git", "coverage", ".next", ".nuxt", ".vscode")
$sourceFolder = "C:\Users\kasan\stock-management-system"

Write-Host "Copying files..." -ForegroundColor Yellow

try {
    # Copy all files and folders except excluded ones
    Get-ChildItem -Path $sourceFolder -Force | Where-Object {
        $_.Name -notin $excludeFolders
    } | ForEach-Object {
        if ($_.PSIsContainer) {
            Write-Host "Copying folder: $($_.Name)" -ForegroundColor Cyan
            Copy-Item -Path $_.FullName -Destination $backupFullPath -Recurse -Force
        } else {
            Write-Host "Copying file: $($_.Name)" -ForegroundColor Gray
            Copy-Item -Path $_.FullName -Destination $backupFullPath -Force
        }
    }

    # Create a backup info file
    $backupInfo = @{
        BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        BackupNote = $BackupNote
        ProjectPath = $sourceFolder
        BackupPath = $backupFullPath
        ExcludedFolders = $excludeFolders -join ", "
        BackupSize = ""
    }

    # Calculate backup size
    $backupSize = (Get-ChildItem -Path $backupFullPath -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
    $backupInfo.BackupSize = "$backupSizeMB MB"

    $backupInfo | ConvertTo-Json | Out-File -FilePath (Join-Path $backupFullPath "backup-info.json") -Encoding UTF8

    Write-Host "`n✅ Backup completed successfully!" -ForegroundColor Green
    Write-Host "📁 Location: $backupFullPath" -ForegroundColor Green
    Write-Host "📊 Size: $backupSizeMB MB" -ForegroundColor Green
    Write-Host "`n💡 To restore this backup, run:" -ForegroundColor Yellow
    Write-Host "   .\restore.ps1 -BackupPath `"$backupFullPath`"" -ForegroundColor White

} catch {
    Write-Error "❌ Backup failed: $($_.Exception.Message)"
    exit 1
}
