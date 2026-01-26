$ErrorActionPreference = 'Stop'

$path = 'c:\poppik-jan\Poppik-ecommerce-live\server\routes.ts'
$c = Get-Content -Raw -LiteralPath $path

# Replace literal backslash-r-backslash-n sequences with real CRLF newlines
$c = $c -replace '\\r\\n', "`r`n"

Set-Content -LiteralPath $path -Value $c -NoNewline
Write-Host 'Replaced literal \\r\\n sequences in routes.ts.'
