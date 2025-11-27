# Affiliate Flow - API Quick Reference

## API Request/Response Examples

### 1. Order Placement with Affiliate Data

**Request:**
```bash
POST /api/orders
Content-Type: application/json

{
  "userId": 123,
  "totalAmount": 449,
  "paymentMethod": "Cash on Delivery",
  "shippingAddress": "123 Main St, Mumbai, Maharashtra 400001",
  "items": [
    {
      "productId": 1,
      "productName": "Lipstick Red",
      "quantity": 2,
      "price": "₹250"
    }
  ],
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+919876543210",
  "affiliateCode": "POPPIKAP13",
  "affiliateDiscount": 400,
  "affiliateCommission": 110,
  "promoCode": null,
  "promoDiscount": 0,
  "redeemAmount": 50,
  "affiliateWalletAmount": 50
}
```

**Response (Success):**
```json
{
  "orderId": "ORD-001",
  "id": 1,
  "status": "pending",
  "totalAmount": 449,
  "affiliateCode": "POPPIKAP13",
  "affiliateDiscount": 400,
  "createdAt": "2025-11-27T10:30:00Z"
}
```

---

### 2. Get Affiliate Wallet

**Request:**
```bash
GET /api/affiliate/wallet?userId=13
```

**Response:**
```json
{
  "userId": 13,
  "cashbackBalance": "0.00",
  "commissionBalance": "550.00",
  "totalEarnings": "1250.50",
  "totalWithdrawn": "700.50",
  "updatedAt": "2025-11-27T10:30:00Z"
}
```

---

### 3. Get Affiliate Application Status

**Request:**
```bash
GET /api/affiliate/my-application?userId=13
```

**Response:**
```json
{
  "id": 1,
  "userId": 13,
  "status": "approved",
  "applicationDate": "2025-11-01T00:00:00Z",
  "approvalDate": "2025-11-15T00:00:00Z"
}
```

---

## Commission Calculation Examples

### Example 1: Standard Order
```
Subtotal (Original): ₹1000
Product Discount: -₹100
Affiliate Discount (40%): -₹400  ← Applied to base subtotal
Promo Discount: -₹50
Cashback Used: -₹50
Affiliate Wallet Used: -₹50
Shipping: ₹99

Final Payable: ₹450

Affiliate Commission: ₹450 × 20% = ₹90
Display: "Affiliate Earns ₹90 (10% commission)"
```

### Example 2: With Multiple Discounts
```
Subtotal (Original): ₹2000
Product Discount: -₹200
Affiliate Discount (40%): -₹800  ← ₹2000 × 40%
Promo Discount: -₹100
Cashback Used: -₹100
Affiliate Wallet Used: -₹75
Shipping: ₹99

Final Payable: ₹824

Affiliate Commission: ₹824 × 20% = ₹164.80
Display: "Affiliate Earns ₹165 (10% commission)"
```

---

## Frontend Implementation Quick Start

### Step 1: Detect Affiliate Link
```javascript
// In cart.tsx useEffect
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode?.toUpperCase().startsWith('POPPIKAP')) {
  localStorage.setItem('referralCode', refCode.toUpperCase());
  setAffiliateCode(refCode.toUpperCase());
}
```

### Step 2: Apply Affiliate Code
```javascript
const applyAffiliateCode = (code: string) => {
  const userDiscountPercentage = 40;
  const discountAmount = (cartSubtotal * userDiscountPercentage) / 100;
  
  setAffiliateCode(code);
  setAffiliateDiscount(discountAmount);
  
  localStorage.setItem('affiliateCode', code);
  localStorage.setItem('affiliateDiscount', JSON.stringify({
    code,
    discount: discountAmount,
    commission: 0 // Will be calculated at checkout
  }));
};
```

### Step 3: Calculate Commission at Checkout
```javascript
// In cart.tsx handleCheckout
const payableAmount = Math.max(0, subtotalAfterDiscount - walletAmount - affiliateWalletAmount);
const affiliateCommission = payableAmount * 0.20; // 20% of payable

setLocation("/checkout", {
  state: {
    items: cartItems,
    affiliateCode,
    affiliateDiscount,
    affiliateCommission,
    // ... other data
  }
});
```

### Step 4: Display on Checkout
```javascript
// In checkout.tsx
<div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-3">
  <div className="flex items-center justify-between">
    <span className="text-sm font-bold text-purple-800">Affiliate Earns</span>
    <span className="text-lg font-bold text-purple-600">₹{affiliateCommission.toLocaleString()}</span>
  </div>
  <p className="text-xs text-purple-700">10% commission on payable amount</p>
</div>
```

### Step 5: Send to Backend
```javascript
const orderData = {
  userId: user.id,
  totalAmount: Math.round(total),
  affiliateCode: affiliateCode || null,
  affiliateDiscount: affiliateDiscount ? Math.round(affiliateDiscount) : null,
  affiliateCommission: affiliateCommission > 0 ? Math.round(affiliateCommission) : null,
  // ... other fields
};

await fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(orderData),
});
```

---

## Backend Implementation Quick Start

### Step 1: Parse Affiliate Code
```typescript
// In POST /api/orders handler
const { affiliateCode, affiliateCommission } = req.body;

if (affiliateCode && affiliateCode.startsWith('POPPIKAP')) {
  const affiliateUserId = parseInt(affiliateCode.replace('POPPIKAP', ''));
  // ... process affiliate
}
```

### Step 2: Verify Affiliate Status
```typescript
const affiliateApp = await db
  .select()
  .from(affiliateApplications)
  .where(and(
    eq(affiliateApplications.userId, affiliateUserId),
    eq(affiliateApplications.status, 'approved')
  ))
  .limit(1);

if (!affiliateApp?.length) {
  return res.status(400).json({ error: "Affiliate not approved" });
}
```

### Step 3: Update Affiliate Wallet
```typescript
let wallet = await db
  .select()
  .from(affiliateWallet)
  .where(eq(affiliateWallet.userId, affiliateUserId))
  .limit(1);

if (wallet.length === 0) {
  await db.insert(affiliateWallet).values({
    userId: affiliateUserId,
    commissionBalance: affiliateCommission.toFixed(2),
    totalEarnings: affiliateCommission.toFixed(2),
    totalWithdrawn: "0.00",
    createdAt: new Date(),
  });
} else {
  const newCommission = parseFloat(wallet[0].commissionBalance) + affiliateCommission;
  const newEarnings = parseFloat(wallet[0].totalEarnings) + affiliateCommission;
  
  await db.update(affiliateWallet)
    .set({
      commissionBalance: newCommission.toFixed(2),
      totalEarnings: newEarnings.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(affiliateWallet.userId, affiliateUserId));
}
```

### Step 4: Record Sale
```typescript
await db.insert(affiliateSales).values({
  affiliateUserId,
  affiliateCode,
  orderId: newOrder.id,
  customerId: userId,
  customerName: customerName,
  customerEmail: customerEmail,
  saleAmount: Math.round(affiliateCommission),
  createdAt: new Date(),
});
```

---

## Testing Scenarios

### Scenario 1: New Affiliate
```
1. User clicks: https://example.com/?ref=POPPIKAP5
2. Add ₹1000 worth of products
3. Apply code POPPIKAP5
4. Expect: ₹400 discount (40%), Commission ₹120
5. Backend: Create new wallet for user 5 with ₹120 commission
```

### Scenario 2: Existing Affiliate
```
1. User clicks: https://example.com/?ref=POPPIKAP2
2. User 2 already has ₹500 in commission
3. Add ₹500 worth of products
4. Apply code POPPIKAP2
5. Expect: ₹200 discount (40%), Commission ₹60
6. Backend: Update wallet - new balance ₹560
```

### Scenario 3: With Promo Code
```
1. Cannot apply both affiliate code AND promo code
2. If affiliate applied first, promo is rejected
3. If promo applied first, affiliate is rejected
4. User must remove one to apply the other
```

---

## Database Schema

### affiliateWallet Table
```sql
CREATE TABLE affiliateWallet (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  cashbackBalance DECIMAL(10, 2) DEFAULT '0.00',
  commissionBalance DECIMAL(10, 2) DEFAULT '0.00',
  totalEarnings DECIMAL(10, 2) DEFAULT '0.00',
  totalWithdrawn DECIMAL(10, 2) DEFAULT '0.00',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### affiliateSales Table
```sql
CREATE TABLE affiliateSales (
  id SERIAL PRIMARY KEY,
  affiliateUserId INTEGER NOT NULL,
  affiliateCode VARCHAR(50),
  orderId INTEGER NOT NULL,
  customerId INTEGER NOT NULL,
  customerName VARCHAR(255),
  customerEmail VARCHAR(255),
  saleAmount DECIMAL(10, 2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (affiliateUserId) REFERENCES users(id),
  FOREIGN KEY (orderId) REFERENCES orders(id)
);
```

### orders Table (Affiliate Fields)
```sql
ALTER TABLE orders ADD COLUMN (
  affiliateCode VARCHAR(50),
  affiliateDiscount DECIMAL(10, 2) DEFAULT 0,
  affiliateWalletAmount DECIMAL(10, 2) DEFAULT 0
);
```

---

## Error Handling

### Common Errors

```javascript
// Invalid affiliate code format
{
  error: "Invalid Affiliate Code",
  message: "Affiliate code must start with POPPIKAP"
}

// Affiliate not approved
{
  error: "Invalid Affiliate",
  message: "Affiliate is not approved"
}

// Cannot combine discounts
{
  error: "Cannot Apply Affiliate Code",
  message: "Promo code already applied. Remove it first."
}
```

---

## Performance Considerations

1. **Database Queries**: Affiliate wallet lookup is single query per order
2. **Caching**: Commission rate can be cached in memory
3. **Batch Processing**: Can batch affiliate wallet updates if needed
4. **Logging**: All commission transactions logged for audit trail

---

## Security Notes

1. ✅ Affiliate code validated to start with POPPIKAP
2. ✅ Commission only added after order creation
3. ✅ Affiliate status verified (approved only)
4. ✅ All amounts rounded and stored as decimals
5. ✅ User ID extracted safely from code

