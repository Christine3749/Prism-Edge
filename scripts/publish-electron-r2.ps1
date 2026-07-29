param(
  [string]$Bucket = "",
  [string]$Version = "",
  [string]$ObjectName = "",
  [string]$DownloadBaseUrl = "https://downloads.prismedge.tech",
  [string]$ManifestKey = "latest.json",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest


function Get-Sha256Hex {
  param([Parameter(Mandatory = $true)][string]$Path)

  $stream = [System.IO.File]::OpenRead($Path)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha256.ComputeHash($stream)
    return -join ($hash | ForEach-Object { $_.ToString("x2") })
  }
  finally {
    $sha256.Dispose()
    $stream.Dispose()
  }
}
function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
  }
}

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$electronPackagePath = Join-Path $repoRoot "apps\electron\package.json"
$electronPackage = Get-Content -LiteralPath $electronPackagePath -Raw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($Bucket)) {
  $Bucket = $env:PRISM_EDGE_R2_BUCKET
}

if ([string]::IsNullOrWhiteSpace($Bucket)) {
  $Bucket = "prism-edge-releases"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = [string]$electronPackage.version
}

$productName = "Prism-Edge"
if ($electronPackage.PSObject.Properties.Name -contains "build") {
  $buildConfig = $electronPackage.build
  if ($buildConfig.PSObject.Properties.Name -contains "productName") {
    $productName = [string]$buildConfig.productName
  }
}

if ([string]::IsNullOrWhiteSpace($ObjectName)) {
  $ObjectName = "$productName-Setup-$Version-win-x64.exe"
}

$distDir = Join-Path $repoRoot "apps\electron\dist"
$installerPath = Join-Path $distDir "$productName Setup $Version.exe"
$blockmapPath = "$installerPath.blockmap"
$blockmapObjectName = "$ObjectName.blockmap"

$wrangler = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wrangler) {
  throw "Wrangler was not found. Install it or run 'wrangler login' from a terminal where wrangler is available."
}

Push-Location $repoRoot
try {
  if (-not $SkipBuild) {
    Invoke-CheckedCommand "npm" @("run", "build")
    Invoke-CheckedCommand "npm" @("run", "electron:dist")
  }

  if (-not (Test-Path -LiteralPath $installerPath)) {
    throw "Installer not found: $installerPath"
  }

  $installer = Get-Item -LiteralPath $installerPath
  if ($installer.Length -gt 315MB) {
    throw "Installer is larger than Wrangler's 315 MB object upload limit. Use Rclone or the R2 S3 API for this release."
  }

  $sha256 = Get-Sha256Hex -Path $installerPath
  $downloadUrl = "$($DownloadBaseUrl.TrimEnd('/'))/$ObjectName"
  $target = "$Bucket/$ObjectName"

  Invoke-CheckedCommand $wrangler.Source @(
    "r2", "object", "put", $target, "--remote",
    "--file", $installerPath,
    "--content-type", "application/vnd.microsoft.portable-executable",
    "--content-disposition", "attachment; filename=`"$ObjectName`"",
    "--cache-control", "public, max-age=31536000, immutable"
  )

  $blockmapUrl = $null
  if (Test-Path -LiteralPath $blockmapPath) {
    $blockmapTarget = "$Bucket/$blockmapObjectName"
    $blockmapUrl = "$($DownloadBaseUrl.TrimEnd('/'))/$blockmapObjectName"

    Invoke-CheckedCommand $wrangler.Source @(
      "r2", "object", "put", $blockmapTarget, "--remote",
      "--file", $blockmapPath,
      "--content-type", "application/octet-stream",
      "--cache-control", "public, max-age=31536000, immutable"
    )
  }

  $manifest = [ordered]@{
    product = $productName
    version = $Version
    platform = "win-x64"
    bucket = $Bucket
    filename = $ObjectName
    url = $downloadUrl
    size = $installer.Length
    sha256 = $sha256
    blockmapUrl = $blockmapUrl
    publishedAt = (Get-Date).ToUniversalTime().ToString("o")
  }

  $manifestPath = Join-Path ([System.IO.Path]::GetTempPath()) "prism-edge-r2-latest.json"
  $manifestJson = $manifest | ConvertTo-Json -Depth 4
  [System.IO.File]::WriteAllText(
    $manifestPath,
    $manifestJson,
    [System.Text.UTF8Encoding]::new($false)
  )

  Invoke-CheckedCommand $wrangler.Source @(
    "r2", "object", "put", "$Bucket/$ManifestKey", "--remote",
    "--file", $manifestPath,
    "--content-type", "application/json",
    "--cache-control", "no-cache"
  )

  Write-Host "Published Prism-Edge desktop installer:"
  Write-Host "  $downloadUrl"
  Write-Host "  sha256: $sha256"
  Write-Host "  manifest: $($DownloadBaseUrl.TrimEnd('/'))/$ManifestKey"
}
finally {
  Pop-Location
}
