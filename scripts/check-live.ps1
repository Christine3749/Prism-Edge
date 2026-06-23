param(
  [string]$Project = "prism-edge-7586",
  [string]$Region = "asia-east1",
  [string]$Domain = "https://msirprism.com"
)

$ErrorActionPreference = "Stop"

function Test-Url {
  param([string]$Url)

  Write-Host "`n== $Url" -ForegroundColor Cyan
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 30
    [PSCustomObject]@{
      Status = $response.StatusCode
      CacheControl = $response.Headers["Cache-Control"]
      ContentLength = $response.Content.Length
    } | Format-List
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host "Retrying with curl.exe..." -ForegroundColor DarkGray
    curl.exe -I --max-time 30 $Url
  }
}

$webUrl = gcloud run services describe prism-edge-web `
  --region $Region `
  --project $Project `
  --format "value(status.url)"

Test-Url "$Domain/?v=live-check"
Test-Url "$Domain/api/market/quote?symbols=BTCUSDT,ETHUSDT"
Test-Url "$webUrl/?v=live-check"
