$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path -Path (Join-Path $scriptDir '..')

Write-Host 'Installing root project dependencies...'
Push-Location $projectRoot
npm install

Write-Host 'Installing server dependencies...'
Push-Location (Join-Path $projectRoot 'server')
npm install

Write-Host 'Creating server .env file for host and port...'
$envFile = Join-Path (Get-Location) '.env'
if (-Not (Test-Path $envFile)) {
  @"
HOST=0.0.0.0
PORT=3000
"@ | Out-File -Encoding UTF8 $envFile
}

Pop-Location
Pop-Location

Write-Host 'Server installation completed.'
Write-Host 'Use: npm run server from project root or node server/index.js from server folder.'
