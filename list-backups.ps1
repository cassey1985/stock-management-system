# List all available backups
param(
    [string]$BackupPath = "C:\Users\kasan\stock-backups"
)

if (!(Test-Path $BackupPath)) {
    Write-Host "❌ No backups found. Backup directory doesn't exist: $BackupPath" -ForegroundColor Red
    exit 1
}

$backups = Get-ChildItem -Path $BackupPath -Directory | Sort-Object CreationTime -Descending

if ($backups.Count -eq 0) {
    Write-Host "❌ No backups found in: $BackupPath" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Available Backups:" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Gray

foreach ($backup in $backups) {
    $backupInfoPath = Join-Path $backup.FullName "backup-info.json"
    $size = (Get-ChildItem -Path $backup.FullName -Recurse -Force | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($size / 1MB, 2)
    
    Write-Host "`n📁 $($backup.Name)" -ForegroundColor Yellow
    Write-Host "   Created: $($backup.CreationTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
    Write-Host "   Size: $sizeMB MB" -ForegroundColor Gray
    Write-Host "   Path: $($backup.FullName)" -ForegroundColor Gray
    
    if (Test-Path $backupInfoPath) {
        try {
            $info = Get-Content $backupInfoPath | ConvertFrom-Json
            if ($info.BackupNote -and $info.BackupNote -ne "") {
                Write-Host "   Note: $($info.BackupNote)" -ForegroundColor Cyan
            }
        } catch {
            # Ignore JSON parsing errors
        }
    }
    
    Write-Host "   To restore: .\restore.ps1 -BackupPath `"$($backup.FullName)`"" -ForegroundColor White
}

Write-Host "`n" -ForegroundColor Gray
