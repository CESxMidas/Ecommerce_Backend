# Repair broken mongod.cfg and start MongoDB. Run in PowerShell AS ADMINISTRATOR.
$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdmin) {
  Write-Host "ERROR: Run PowerShell as Administrator." -ForegroundColor Red
  exit 1
}

$cfgPath = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg"
$fixed = Join-Path $PSScriptRoot "mongod.cfg.fixed"

if (-not (Test-Path $fixed)) { throw "Missing $fixed" }

Copy-Item -Path $fixed -Destination $cfgPath -Force
Write-Host "[replica-set] Restored $cfgPath from mongod.cfg.fixed"

Start-Service MongoDB
Write-Host "[replica-set] Started MongoDB"

Start-Sleep -Seconds 3

$backendRoot = Split-Path $PSScriptRoot -Parent
Push-Location $backendRoot
try {
  node scripts/initReplicaSet.js
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Done. In this folder run:"
Write-Host "  npm run seed:test"
Write-Host "  npm run test:integration"
