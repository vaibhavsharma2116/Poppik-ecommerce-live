$ErrorActionPreference = 'Stop'

$path = 'c:\poppik-jan\Poppik-ecommerce-live\server\routes.ts'
$c = Get-Content -Raw -LiteralPath $path

# Fix invalid route handler closures introduced by overly-broad casting.
# This targets lines that consist ONLY of: "} as any);" (optionally indented)
# which is invalid for app.get/app.post/etc. handlers.
$c = [regex]::Replace(
  $c,
  '(?m)^(\s*)\}\s+as\s+any\);\s*$',
  '${1});'
)

Set-Content -LiteralPath $path -Value $c -NoNewline
Write-Host 'Fixed route handler closures in routes.ts.'
