# LOCUS — setup inicial (Windows)
$ErrorActionPreference = "Stop"

Write-Host "=== LOCUS Setup ===" -ForegroundColor Cyan

# Rust en PATH (sesiones que no recargaron tras rustup)
$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path $cargoBin) {
    $env:PATH = "$cargoBin;$env:PATH"
}

Write-Host "`n[1/4] Dependencias del monorepo..." -ForegroundColor Yellow
pnpm install

Write-Host "`n[2/4] Comprobando Ollama..." -ForegroundColor Yellow
try {
    $ollama = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3
    Write-Host "  Ollama OK — modelos: $($ollama.models.Count)" -ForegroundColor Green
} catch {
    Write-Host "  Ollama no responde. Asegurate de que esta en ejecucion." -ForegroundColor Red
}

Write-Host "`n[3/4] OpenClaw (opcional en setup)..." -ForegroundColor Yellow
$openclaw = Get-Command openclaw -ErrorAction SilentlyContinue
if ($openclaw) {
    Write-Host "  openclaw CLI encontrado: $($openclaw.Source)" -ForegroundColor Green
    Write-Host "  Ejecuta manualmente: openclaw onboard" -ForegroundColor Gray
} else {
    Write-Host "  openclaw no instalado. Instalar con:" -ForegroundColor Yellow
    Write-Host "    npm install -g openclaw" -ForegroundColor Gray
}

Write-Host "`n[4/4] Modelo sugerido para empezar..." -ForegroundColor Yellow
Write-Host "  ollama pull qwen2.5:7b" -ForegroundColor Gray

Write-Host "`n=== Listo. Arrancar dev: pnpm dev ===" -ForegroundColor Cyan
