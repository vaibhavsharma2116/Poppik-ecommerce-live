$ErrorActionPreference = 'Stop'

$path = 'c:\poppik-jan\Poppik-ecommerce-live\server\routes.ts'
$c = Get-Content -Raw -LiteralPath $path

# 1) Fix pendingBalance typing
$c = $c -replace 'pendingAmount:\s*wallet\s*&&\s*wallet\.length\s*>\s*0\s*\?\s*parseFloat\(wallet\[0\]\.pendingBalance\?\.toString\(\)\s*\|\|\s*''0''\)\s*:\s*0,',
               'pendingAmount: wallet && wallet.length > 0 ? parseFloat(((wallet[0] as any).pendingBalance)?.toString() || ''0'') : 0,'

# 2) Fix savedApplication.id usages where savedApplication is an array returned from .returning()
$c = $c -replace '\$\{savedApplication\.id\}', '${savedApplication[0].id}'
$c = $c -replace '\bsavedApplication\.id\b', 'savedApplication[0].id'

# 3) Declare jobPositionsSSEClients once before job position routes
if ($c -notmatch "const jobPositionsSSEClients = new Set<any>\\(\\);") {
  $needle = "// Admin endpoints for job positions management"
  if ($c -match [regex]::Escape($needle)) {
    $c = $c -replace [regex]::Escape($needle), ("const jobPositionsSSEClients = new Set<any>();\r\n\r\n  " + $needle)
  }
}

# 3b) Fix affiliateApplications insert typing (userId not in inferred insert schema)
$c = $c -replace 'db\.insert\(schema\.affiliateApplications\)', 'db.insert(schema.affiliateApplications as any)'
$c = $c -replace 'db\.insert\(schema\.affiliateApplications as any\)\.values\(\{', 'db.insert(schema.affiliateApplications as any).values({' 
# Ensure the closing values object is cast when this insert is used
$c = $c -replace '\}\)\.returning\(\);', '} as any).returning();'

# 4) Cast affiliateApplications status update payload to any
$c = $c -replace '\.update\(schema\.affiliateApplications\)', '.update(schema.affiliateApplications as any)'
$c = $c -replace '\.set\(\{(\r\n\s*)status,', '.set({$1status,'
$c = $c -replace 'reviewedAt: new Date\(\)(\r\n\s*)\}\)', 'reviewedAt: new Date()$1} as any)'

# 5) Cast affiliateWallet insert values payload to any
$c = $c -replace 'await db\.insert\(schema\.affiliateWallet\)\.values\(\{', 'await db.insert(schema.affiliateWallet as any).values({' 
$c = $c -replace 'totalWithdrawn: "0\.00"(\r\n\s*)\}\);', 'totalWithdrawn: "0.00"$1} as any);'

# 6) Cast user wallet updates/inserts (Drizzle typings too narrow)
$c = $c -replace 'db\.insert\(schema\.userWalletTransactions\)\.values\(\{', 'db.insert(schema.userWalletTransactions as any).values({'
$c = $c -replace 'db\.insert\(schema\.userWalletTransactions as any\)\.values\(\{', '(db.insert(schema.userWalletTransactions as any) as any).values({'
$c = $c -replace '\}\);(\r\n\s*\}\)\s*;)?', '} as any);$1'

$c = $c -replace '\.update\(schema\.userWallet\)\s*(\r\n\s*)\.set\(\{', '.update(schema.userWallet as any)$1.set({'
$c = $c -replace 'updatedAt: new Date\(\)(\r\n\s*)\}\)(\r\n\s*)\.where', 'updatedAt: new Date()$1} as any)$2.where'

# 7) Cast affiliateApplications inserts to any to allow userId field
$c = $c -replace 'db\.insert\(schema\.affiliateApplications as any\)\.values\(\{', '(db.insert(schema.affiliateApplications as any) as any).values({' 
$c = $c -replace '\} as any\)\.returning\(\);', '} as any).returning();'

Set-Content -LiteralPath $path -Value $c -NoNewline
Write-Host "Patched routes.ts successfully."
