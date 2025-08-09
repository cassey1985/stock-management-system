# Simple decimal fix
$dataFile = "server\data\business-data.json"
$backupFile = "server\data\backup-decimal-fix-" + (Get-Date -Format "yyyy-MM-dd-HH-mm-ss") + ".json"

Write-Host "Fixing decimal precision issues..."
Copy-Item $dataFile $backupFile
Write-Host "Backup created: $backupFile"

$content = Get-Content $dataFile -Raw
$content = $content -replace '"balance": 91400\.01,', '"balance": 91400,'
$content = $content -replace '"balance": 91940\.01,', '"balance": 91940,'  
$content = $content -replace '"creditAmount": 2399\.99,', '"creditAmount": 2400,'
$content = $content -replace '"creditAmount": 1859\.99,', '"creditAmount": 1860,'
$content | Set-Content $dataFile -Encoding UTF8

Write-Host "Decimal precision fixed!"
