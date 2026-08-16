# Continuous CDL ERP Testing Loop
# Runs every 5 minutes until manually stopped

Write-Host "Starting continuous CDL ERP testing..." -ForegroundColor Green

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Running test cycle..." -ForegroundColor Cyan

    try {
        node skyvern-targeted-test.mjs
        Write-Host "[$timestamp] Test cycle complete." -ForegroundColor Green
    } catch {
        Write-Host "[$timestamp] Test error: $_" -ForegroundColor Red
    }

    Write-Host "[$timestamp] Waiting 5 minutes..." -ForegroundColor Yellow
    Start-Sleep -Seconds 300
}