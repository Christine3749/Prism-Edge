param(
  [string]$Project = "prism-edge-7586",
  [string]$Region = "asia-east1",
  [string]$Domain = "https://msirprism.com",
  [string]$WwwDomain = "https://www.msirprism.com"
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


function Test-PageAssets {
  param([string]$BaseUrl)

  Write-Host "`n== $BaseUrl assets" -ForegroundColor Cyan
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/?v=asset-check" -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 30
    $assets = [regex]::Matches($response.Content, '(?:src|href)="([^"]+)"') |
      ForEach-Object { $_.Groups[1].Value } |
      Where-Object { $_ -match '^/(assets|favicon|manifest)' } |
      Select-Object -Unique

    foreach ($asset in $assets) {
      $assetUrl = "$BaseUrl$asset"
      try {
        $assetResponse = Invoke-WebRequest -UseBasicParsing -Uri $assetUrl -Method Head -TimeoutSec 30
        [PSCustomObject]@{
          Asset = $asset
          Status = $assetResponse.StatusCode
          CacheControl = $assetResponse.Headers["Cache-Control"]
          Server = $assetResponse.Headers["Server"]
        } | Format-List
      } catch {
        Write-Host "$asset failed: $($_.Exception.Message)" -ForegroundColor Yellow
      }
    }
  } catch {
    Write-Host $_.Exception.Message -ForegroundColor Yellow
  }
}
$webUrl = ""
try {
  $webUrl = gcloud run services describe prism-edge-web `
    --region $Region `
    --project $Project `
    --format "value(status.url)"
} catch {
  Write-Host "Could not resolve Cloud Run URL through gcloud: $($_.Exception.Message)" -ForegroundColor Yellow
}

Test-Url "$Domain/?v=live-check"
Test-Url "$WwwDomain/?v=live-check"
Test-Url "$Domain/api/market/quote?symbols=BTCUSDT,ETHUSDT"
Test-Url "$WwwDomain/api/market/quote?symbols=BTCUSDT,ETHUSDT"
Test-PageAssets $Domain
Test-PageAssets $WwwDomain
if ($webUrl) {
  Test-Url "$webUrl/?v=live-check"
}
