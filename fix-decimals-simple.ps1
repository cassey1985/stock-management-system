# Simple decimal fix for business data
$dataFile = "server\data\business-data.json"

Write-Host "🔧 Fixing decimal precision issues..." -ForegroundColor Yellow

# Create backup first
$timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
$backupFile = "server\data\backup-decimal-fix-$timestamp.json"
Copy-Item $dataFile $backupFile
Write-Host "✅ Backup created: $backupFile" -ForegroundColor Green

# Read and fix the content
$content = Get-Content $dataFile -Raw

# Fix specific problematic values
$content = $content -replace '"balance": 91400\.01,', '"balance": 91400,'
$content = $content -replace '"balance": 91940\.01,', '"balance": 91940,'  
$content = $content -replace '"creditAmount": 2399\.99,', '"creditAmount": 2400,'
$content = $content -replace '"creditAmount": 1859\.99,', '"creditAmount": 1860,'

# Save the fixed content
$content | Set-Content $dataFile -Encoding UTF8

Write-Host "🎉 Decimal precision fixed!" -ForegroundColor Green
Write-Host "Values fixed:" -ForegroundColor Cyan
Write-Host "  91400.01 -> 91400" -ForegroundColor White
Write-Host "  91940.01 -> 91940" -ForegroundColor White
Write-Host "  2399.99 -> 2400" -ForegroundColor White
Write-Host "  1859.99 -> 1860" -ForegroundColor White
