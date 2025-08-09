# Improved Backup Script - Handles long paths and nested node_modules better
# This version uses robocopy for better Windows path handling

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
$sourceFolder = "C:\Users\kasan\stock-management-system"

Write-Host "🚀 Creating backup: $backupName" -ForegroundColor Green
Write-Host "📁 Backup location: $backupFullPath" -ForegroundColor Yellow

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "✅ Created backup directory: $BackupPath" -ForegroundColor Cyan
}

# Create the specific backup folder
New-Item -ItemType Directory -Path $backupFullPath -Force | Out-Null

# Use robocopy for better handling of long paths and nested folders
# /MIR = Mirror (copy all files and remove from destination if not in source)
# /XD = Exclude directories
# /R:0 = 0 retries on failed copies
# /W:0 = 0 wait time between retries
# /MT:8 = Use 8 threads for faster copying
# /NFL = No file list (less verbose)
# /NDL = No directory list (less verbose)

Write-Host "📋 Copying files using robocopy..." -ForegroundColor Yellow

$excludeDirs = @("node_modules", "dist", "build", ".git", "coverage", ".next", ".nuxt", ".vscode")
$excludeArgs = $excludeDirs | ForEach-Object { "/XD `"$_`"" }

$robocopyArgs = @(
    "`"$sourceFolder`""
    "`"$backupFullPath`""
    "/MIR"
    "/R:0"
    "/W:0"
    "/MT:8"
    "/NFL"
    "/NDL"
) + $excludeArgs

try {
    Write-Host "Running: robocopy $($robocopyArgs -join ' ')" -ForegroundColor Gray
    
    # Run robocopy and capture exit code
    $result = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -PassThru -WindowStyle Hidden
    
    # Robocopy exit codes: 0=no files copied, 1=files copied successfully, 2=extra files/dirs found
    # Any code >7 indicates an error
    if ($result.ExitCode -gt 7) {
        throw "Robocopy failed with exit code: $($result.ExitCode)"
    }
    
    Write-Host "✅ Files copied successfully!" -ForegroundColor Green
    
    # Create a backup info file
    $backupInfo = @{
        BackupDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        BackupNote = $BackupNote
        ProjectPath = $sourceFolder
        BackupPath = $backupFullPath
        ExcludedFolders = $excludeDirs -join ", "
        RobocopyExitCode = $result.ExitCode
        BackupSize = ""
    }

    # Calculate backup size
    Write-Host "📊 Calculating backup size..." -ForegroundColor Yellow
    $backupSize = (Get-ChildItem -Path $backupFullPath -Recurse -Force -ErrorAction SilentlyContinue | 
                   Measure-Object -Property Length -Sum).Sum
    $backupSizeMB = [math]::Round($backupSize / 1MB, 2)
    $backupInfo.BackupSize = "$backupSizeMB MB"

    $backupInfo | ConvertTo-Json | Out-File -FilePath (Join-Path $backupFullPath "backup-info.json") -Encoding UTF8

    Write-Host "`n🎉 Backup completed successfully!" -ForegroundColor Green
    Write-Host "📁 Location: $backupFullPath" -ForegroundColor Green
    Write-Host "📊 Size: $backupSizeMB MB" -ForegroundColor Green
    Write-Host "📋 Robocopy exit code: $($result.ExitCode) (1-2 = success)" -ForegroundColor Cyan
    Write-Host "`n💡 To restore this backup, run:" -ForegroundColor Yellow
    Write-Host "   .\restore.ps1 -BackupPath `"$backupFullPath`"" -ForegroundColor White

} catch {
    Write-Error "❌ Backup failed: $($_.Exception.Message)"
    
    # Clean up incomplete backup
    if (Test-Path $backupFullPath) {
        Write-Host "🧹 Cleaning up incomplete backup..." -ForegroundColor Yellow
        Remove-Item -Path $backupFullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    exit 1
}
