$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:3000"
$email = "refresh-demo-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"
$password = "Password123!"

Write-Host "== GreenAlert refresh token flow ==" -ForegroundColor Cyan
Write-Host "API: $baseUrl"
Write-Host ""

Write-Host "1. Health check" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
$health | ConvertTo-Json -Depth 5
Write-Host ""

Write-Host "2. Registro de usuario temporal" -ForegroundColor Yellow
$registerBody = @{
  nombre = "Refresh"
  apellido = "Demo"
  email = $email
  password = $password
  telefono = "3000000000"
} | ConvertTo-Json

$register = Invoke-RestMethod `
  -Uri "$baseUrl/auth/register" `
  -Method POST `
  -ContentType "application/json" `
  -Body $registerBody

Write-Host "Usuario: $email"
Write-Host "Access token recibido: $([bool]$register.data.accessToken)"
Write-Host "Refresh token recibido: $([bool]$register.data.refreshToken)"
Write-Host ""

Write-Host "3. Renovar access token con refresh token" -ForegroundColor Yellow
$oldRefreshToken = $register.data.refreshToken
$refreshBody = @{ refreshToken = $oldRefreshToken } | ConvertTo-Json

$refresh = Invoke-RestMethod `
  -Uri "$baseUrl/auth/refresh" `
  -Method POST `
  -ContentType "application/json" `
  -Body $refreshBody

Write-Host "Refresh exitoso: $($refresh.status)"
Write-Host "Nuevo access token recibido: $([bool]$refresh.data.accessToken)"
Write-Host "Nuevo refresh token recibido: $([bool]$refresh.data.refreshToken)"
Write-Host "Refresh token rotado: $($refresh.data.refreshToken -ne $oldRefreshToken)"
Write-Host ""

Write-Host "4. Reusar refresh token viejo debe fallar" -ForegroundColor Yellow
try {
  Invoke-RestMethod `
    -Uri "$baseUrl/auth/refresh" `
    -Method POST `
    -ContentType "application/json" `
    -Body $refreshBody | ConvertTo-Json -Depth 5
} catch {
  $_.ErrorDetails.Message
}
Write-Host ""

Write-Host "5. Logout invalida el refresh token actual" -ForegroundColor Yellow
$logoutBody = @{ refreshToken = $refresh.data.refreshToken } | ConvertTo-Json
$logout = Invoke-RestMethod `
  -Uri "$baseUrl/auth/logout" `
  -Method POST `
  -ContentType "application/json" `
  -Body $logoutBody

$logout | ConvertTo-Json -Depth 5
Write-Host ""

Write-Host "6. Usar refresh token despues de logout debe fallar" -ForegroundColor Yellow
try {
  Invoke-RestMethod `
    -Uri "$baseUrl/auth/refresh" `
    -Method POST `
    -ContentType "application/json" `
    -Body $logoutBody | ConvertTo-Json -Depth 5
} catch {
  $_.ErrorDetails.Message
}
Write-Host ""

Write-Host "Prueba finalizada." -ForegroundColor Green

