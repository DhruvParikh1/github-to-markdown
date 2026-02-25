$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

$manifestPath = Join-Path $repoRoot "manifest.json"
if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found at $manifestPath"
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version

if (-not $version) {
  throw "Unable to read extension version from manifest.json"
}

$distDir = Join-Path $repoRoot "dist"
if (-not (Test-Path $distDir)) {
  New-Item -ItemType Directory -Path $distDir | Out-Null
}

$zipName = "github-to-markdown-v$version.zip"
$zipPath = Join-Path $distDir $zipName

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$tempDir = Join-Path $distDir "_package_tmp"
if (Test-Path $tempDir) {
  Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

$packageItems = @(
  "manifest.json",
  "background.js",
  "content.js",
  "parser.js",
  "injector.js",
  "popup",
  "icons"
)

foreach ($item in $packageItems) {
  $sourcePath = Join-Path $repoRoot $item
  if (-not (Test-Path $sourcePath)) {
    throw "Required package item not found: $item"
  }

  $destinationPath = Join-Path $tempDir $item
  if ((Get-Item $sourcePath).PSIsContainer) {
    Copy-Item $sourcePath -Destination $destinationPath -Recurse
  }
  else {
    Copy-Item $sourcePath -Destination $destinationPath
  }
}

Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $tempDir -Recurse -Force

Write-Host "Package created: $zipPath"
