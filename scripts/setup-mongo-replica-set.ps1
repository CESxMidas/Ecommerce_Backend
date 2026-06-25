# Configure local MongoDB as single-node replica set (Windows).
# MUST run in PowerShell AS ADMINISTRATOR (not Cursor terminal):
#   Right-click PowerShell -> Run as administrator
#   cd C:\Users\KT03\Documents\E-Commerce\Ecommerce_Backend
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\scripts\setup-mongo-replica-set.ps1

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
  Write-Host ""
  Write-Host "ERROR: This script must run as Administrator." -ForegroundColor Red
  Write-Host "  Editing C:\Program Files\MongoDB\... requires elevated rights." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Do this:" -ForegroundColor Cyan
  Write-Host "  1. Press Win, type: powershell"
  Write-Host "  2. Right-click 'Windows PowerShell' -> Run as administrator"
  Write-Host "  3. cd C:\Users\KT03\Documents\E-Commerce\Ecommerce_Backend"
  Write-Host "  4. Set-ExecutionPolicy -Scope Process Bypass"
  Write-Host "  5. .\scripts\setup-mongo-replica-set.ps1"
  Write-Host ""
  Write-Host "Or edit mongod.cfg manually (see Ecommerce_QA/TESTING.md)." -ForegroundColor Gray
  exit 1
}

$cfgPath = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg"
$serviceName = "MongoDB"

if (-not (Test-Path $cfgPath)) {
  $found = Get-ChildItem "C:\Program Files\MongoDB\Server" -Recurse -Filter "mongod.cfg" -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($found) { $cfgPath = $found } else { throw "mongod.cfg not found under Program Files\MongoDB" }
}

$cfg = Get-Content $cfgPath -Raw

if ($cfg -match "replSetName:\s*rs0") {
  Write-Host "[replica-set] mongod.cfg already has replSetName=rs0"
} else {
  # Fix corrupted line from older script versions (rs0#sharding:)
  $cfg = $cfg -replace "replSetName:\s*rs0#sharding:", "replSetName: rs0`r`n`r`n#sharding:"

  if ($cfg -match "#replication:") {
    $cfg = $cfg -replace "#replication:\s*\r?\n", "replication:`r`n  replSetName: rs0`r`n`r`n"
  } elseif ($cfg -notmatch "(?m)^replication:") {
    if ($cfg -match "#sharding:") {
      $cfg = $cfg -replace "#sharding:", "replication:`r`n  replSetName: rs0`r`n`r`n#sharding:"
    } else {
      $cfg = $cfg.TrimEnd() + "`r`n`r`nreplication:`r`n  replSetName: rs0`r`n"
    }
  } else {
    throw "mongod.cfg has replication section but not rs0 - edit manually: replSetName: rs0"
  }

  Set-Content -Path $cfgPath -Value $cfg -Encoding UTF8
  Write-Host "[replica-set] Updated $cfgPath"
}

$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $svc) { throw "MongoDB Windows service '$serviceName' not found" }

if ($svc.Status -eq "Running") {
  Restart-Service -Name $serviceName -Force
  Write-Host "[replica-set] Restarted $serviceName"
} else {
  Start-Service -Name $serviceName
  Write-Host "[replica-set] Started $serviceName"
}

Start-Sleep -Seconds 3

$backendRoot = Split-Path $PSScriptRoot -Parent
Push-Location $backendRoot
try {
  node scripts/initReplicaSet.js
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Done. Use in .env.test:"
Write-Host "  TEST_MONGODB_URL=mongodb://127.0.0.1:27017/keyshop_qa?replicaSet=rs0"
Write-Host ""
Write-Host "Then: npm run seed:test; npm run test:integration"
