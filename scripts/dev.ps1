$ErrorActionPreference = "Stop"
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) {
    $env:PATH = "$cargoBin;$env:PATH"
}
Set-Location (Split-Path $PSScriptRoot -Parent)
pnpm dev
