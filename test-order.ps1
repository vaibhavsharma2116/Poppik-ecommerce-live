# Test Order Script - Check affiliateCommission value

$uri = "http://localhost:3000/api/orders"

$body = @{
    userId = 12
    totalAmount = 146
    paymentMethod = "Cash on Delivery"
    shippingAddress = "Test Address, City, State 123456"
    items = @(
        @{
            productId = 1
            productName = "Test Product"
            productImage = "https://example.com/product.jpg"
            price = "100"
            quantity = 1
            affiliateCommission = 100
        }
    )
    customerName = "Test User"
    customerEmail = "test@example.com"
    customerPhone = "9999999999"
    affiliateCode = "POPPIKAP12"
    affiliateCommission = 100
} | ConvertTo-Json

Write-Host "Sending test order with affiliateCommission = 100..." -ForegroundColor Green
Write-Host "Request Body:" -ForegroundColor Cyan
Write-Host $body
Write-Host "`nPosting to: $uri`n" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json" -Body $body
    Write-Host "Response:" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
    Write-Host "`nOrder placed successfully!`n" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $response = $reader.ReadToEnd()
        Write-Host "Response Body: $response" -ForegroundColor Red
    }
}
