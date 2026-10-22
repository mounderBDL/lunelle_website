param(
    [string]$PgBin    = "C:\Program Files\PostgreSQL\18\bin",
    [string]$Database = "lunelle",
    [string]$DbUser   = "lunelle",
    [string]$OutDir   = "$PSScriptRoot\..\backups",
    [int]$Keep        = 14
)

if (-not $env:PGPASSWORD) {
    Write-Error "Set the password first:  `$env:PGPASSWORD = '...'"
    exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$file = Join-Path $OutDir ("{0}-{1}.dump" -f $Database, (Get-Date -Format "yyyyMMdd-HHmmss"))

& "$PgBin\pg_dump.exe" -h localhost -U $DbUser -Fc -f $file $Database
if ($LASTEXITCODE -ne 0) {
    Write-Error "pg_dump failed"
    exit 1
}

# keep only the newest $Keep backups
Get-ChildItem $OutDir -Filter "$Database-*.dump" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip $Keep |
    Remove-Item

Write-Host "Backup written: $file"