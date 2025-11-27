# Affiliate Flow Implementation Guide

## Overview
This document describes the complete affiliate discount and commission flow implemented in the Poppik e-commerce platform.

## Complete Affiliate Flow

### 1. **URL Parameter Detection & Initial Setup**
**Location:** `client/src/pages/cart.tsx` (useEffect hook)

When a user clicks a referral link like `/?ref=POPPIKAP13`:
- URL parameter `?ref=POPPIKAP13` is automatically detected
- Affiliate code is saved to `localStorage` with key `referralCode`
- Toast notification confirms the affiliate code has been saved
- User is ready to apply the discount in cart

```javascript
// Check for affiliate code in URL parameters
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode && refCode.toUpperCase().startsWith('POPPIKAP')) {
  localStorage.setItem('referralCode', refCode.toUpperCase());
  setAffiliateCode(refCode.toUpperCase());
}
```

---

### 2. **Affiliate Code Application on Cart Page**
**Location:** `client/src/pages/cart.tsx`

#### User applies affiliate code (e.g., POPPIKAP13):

**Input:** Promo code field receives `POPPIKAP13`

**Processing:**
```javascript
const applyAffiliateCode = (code: string) => {
  const userDiscountPercentage = 40; // 40% discount
  let discountAmount = (cartSubtotal * userDiscountPercentage) / 100;
```

**Output:**
- ✅ 40% discount calculated and applied
- ✅ Discount stored in state: `affiliateDiscount`
- ✅ Code stored in state: `affiliateCode`
- ✅ localStorage updated with keys:
  - `affiliateCode`: "POPPIKAP13"
  - `referralCode`: "POPPIKAP13"
  - `affiliateDiscount`: JSON object with discount amount and percentage

**Display on Cart Page:**
```
Applied Affiliate Code: POPPIKAP13 (Save ₹XXX)
```

**Discount Breakdown:**
- Subtotal (Original Price): ₹XXX
- Affiliate Discount (POPPIKAP13): -₹XXX (40%)
- Product Discounts: -₹XXX
- Cart Subtotal After Affiliate: ₹XXX

---

### 3. **Affiliate Commission Calculation on Cart Page**
**Location:** `client/src/pages/cart.tsx` (handleCheckout function)

**Commission Calculation Formula:**
```javascript
// Calculate affiliate commission: 20% of the final payable amount
const payableAmount = Math.max(0, subtotalAfterDiscount - walletAmount - affiliateWalletAmount);
const affiliateCommission = payableAmount * 0.20; // 20% of payable amount
```

**Variables Used:**
- `subtotalAfterDiscount`: Subtotal after all discounts are applied
- `walletAmount`: Cashback wallet amount redeemed
- `affiliateWalletAmount`: Affiliate wallet amount redeemed
- **Commission Rate: 20% of payable amount (which equals 10% displayed on checkout)**

**Example Calculation:**
```
Subtotal: ₹1000
Affiliate Discount (40%): -₹400
Promo Discount: -₹50
Final Payable Amount: ₹550
Affiliate Commission (20% of payable): ₹110
```

---

### 4. **Data Passed to Checkout Page**
**Location:** `client/src/pages/cart.tsx` → `handleCheckout()`

**State Object Passed:**
```javascript
setLocation("/checkout", {
  state: {
    items: cartItems,
    walletAmount,
    affiliateWalletAmount,
    promoCode: appliedPromo,
    promoDiscount: generalPromoDiscount,
    affiliateCode: affiliateCode,
    affiliateDiscount: affiliateDiscount,
    affiliateCommission: affiliateCommission,  // ✅ NEW
  }
});
```

**localStorage Updated:**
```javascript
localStorage.setItem('affiliateDiscount', JSON.stringify({
  code: affiliateCode,
  discount: affiliateDiscount,
  commission: affiliateCommission  // ✅ NEW
}));
```

---

### 5. **Checkout Page Display**
**Location:** `client/src/pages/checkout.tsx`

#### Data Loading (Component Initialization):
```javascript
// Destructure from location state
const { 
  affiliateCode: passedAffiliateCode = "", 
  affiliateDiscount: passedAffiliateDiscount = 0,
  affiliateCommission: passedAffiliateCommission = 0  // ✅ NEW
} = (location as any).state || {};

// Load from localStorage if not in state
const [affiliateCommissionAmount, setAffiliateCommissionAmount] = useState(() => {
  if (passedAffiliateCommission > 0) {
    return passedAffiliateCommission;
  }
  const savedAffiliateDiscount = localStorage.getItem('affiliateDiscount');
  if (savedAffiliateDiscount) {
    const affiliateData = JSON.parse(savedAffiliateDiscount);
    return affiliateData.commission || 0;
  }
  return 0;
});
```

#### Order Summary Display:
```
Order Summary
─────────────
Subtotal (10 items)              ₹1000
Affiliate Discount (POPPIKAP13)  -₹400
Product Discount                 -₹100
Promo Discount                   -₹50
Cashback Wallet                  -₹50
Affiliate Wallet                 -₹50
Shipping                         ₹99
─────────────
Total                           ₹449

┌─────────────────────────────────┐
│ 🏆 Affiliate Earns: ₹90         │
│ 10% commission on payable amount│
└─────────────────────────────────┘
```

---

### 6. **Order Placement & Backend Integration**
**Location:** `client/src/pages/checkout.tsx` → `handlePlaceOrder()`

#### Order Data Sent to Backend:
```javascript
const orderData = {
  userId: user.id,
  totalAmount: Math.round(total),
  paymentMethod: paymentMethod,
  shippingAddress: shippingAddressData,
  items: itemsData,
  
  // ✅ Affiliate Fields
  affiliateCode: formData.affiliateCode || passedAffiliateCode || null,
  affiliateCommission: affiliateCommission > 0 ? affiliateCommission : null,
  affiliateDiscount: affiliateDiscountAmount > 0 ? Math.round(affiliateDiscountAmount) : null,
  
  // Other fields
  promoCode: appliedPromo?.code || null,
  promoDiscount: promoDiscount > 0 ? Math.round(promoDiscount) : null,
  redeemAmount: Math.round(redeemAmount) || 0,
  affiliateWalletAmount: Math.round(affiliateWalletAmount) || 0,
  customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
  customerEmail: formData.email.trim(),
  customerPhone: formData.phone.trim(),
};

// Send to backend
const response = await fetch("/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(orderData),
});
```

---

### 7. **Backend Order Processing**
**Location:** `server/routes.ts` → `POST /api/orders`

#### Order Creation:
```typescript
// 1. Create order in ordersTable with affiliate data
const newOrderData = {
  userId: Number(userId),
  totalAmount: Number(totalAmount),
  status: 'pending',
  paymentMethod: paymentMethod,
  shippingAddress: shippingAddress,
  
  // ✅ Affiliate Fields
  affiliateCode: affiliateCode || null,
  affiliateDiscount: affiliateDiscount ? Math.round(affiliateDiscount) : 0,
  
  // Other fields...
};

const [newOrder] = await db.insert(ordersTable).values(newOrderData).returning();
```

#### Affiliate Commission Processing:
```typescript
// 2. Process affiliate commission
if (affiliateCode && affiliateCode.startsWith('POPPIKAP')) {
  const affiliateUserId = parseInt(affiliateCode.replace('POPPIKAP', ''));
  
  // Verify affiliate is approved
  const affiliateApp = await db
    .select()
    .from(affiliateApplications)
    .where(and(
      eq(affiliateApplications.userId, affiliateUserId),
      eq(affiliateApplications.status, 'approved')
    ));
  
  if (affiliateApp && affiliateApp.length > 0) {
    // Get or create affiliate wallet
    let wallet = await db
      .select()
      .from(affiliateWallet)
      .where(eq(affiliateWallet.userId, affiliateUserId));
    
    if (wallet.length === 0) {
      // Create new wallet
      await db.insert(affiliateWallet).values({
        userId: affiliateUserId,
        commissionBalance: affiliateCommission.toFixed(2),
        totalEarnings: affiliateCommission.toFixed(2),
        // ...
      });
    } else {
      // Update existing wallet
      const newCommission = parseFloat(wallet[0].commissionBalance) + affiliateCommission;
      const newEarnings = parseFloat(wallet[0].totalEarnings) + affiliateCommission;
      
      await db.update(affiliateWallet)
        .set({
          commissionBalance: newCommission.toFixed(2),
          totalEarnings: newEarnings.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(affiliateWallet.userId, affiliateUserId));
    }
    
    // 3. Record affiliate sale
    await db.insert(affiliateSales).values({
      affiliateUserId,
      affiliateCode,
      orderId: newOrder.id,
      customerId: Number(userId),
      // ...
    });
  }
}
```

---

## Data Flow Diagram

```
USER JOURNEY
────────────

1. Click Referral Link
   ↓
   /?ref=POPPIKAP13
   ↓
   URL detected → Save to localStorage
   ↓

2. Browse Products & Add to Cart
   ↓
   Cart Page Loads
   ↓

3. Apply Affiliate Code (Optional)
   ↓
   User enters POPPIKAP13
   ↓
   40% Discount Calculated
   ├─ Discount Amount: ₹XXX
   └─ Commission (20% of payable): ₹YYY
   ↓
   Stored in localStorage
   ↓

4. Proceed to Checkout
   ↓
   Cart passes state with:
   ├─ affiliateCode
   ├─ affiliateDiscount
   └─ affiliateCommission
   ↓

5. Review Order Summary
   ↓
   Display:
   ├─ Affiliate Discount: -₹XXX
   └─ Affiliate Earns: ₹YYY
   ↓

6. Place Order
   ↓
   Send to backend:
   ├─ affiliateCode
   ├─ affiliateDiscount
   └─ affiliateCommission
   ↓

7. Backend Processing
   ↓
   ├─ Create Order with affiliate data
   ├─ Update Affiliate Wallet
   ├─ Add Commission to Balance
   └─ Record Affiliate Sale
   ↓

8. Affiliate Dashboard
   ↓
   Affiliate sees:
   ├─ Commission Earned: ₹YYY
   ├─ Total Earnings: ₹ZZZ
   └─ List of Sales
```

---

## Key States & Variables

### Cart Page (`cart.tsx`)
```javascript
affiliateCode: string | null          // Affiliate code (e.g., "POPPIKAP13")
affiliateDiscount: number             // 40% discount amount
cartSubtotal: number                  // Total before discounts
subtotalAfterDiscount: number         // Total after all discounts
affiliateCommission: number           // 20% of payable amount
```

### Checkout Page (`checkout.tsx`)
```javascript
affiliateDiscountAmount: number       // 40% discount amount
affiliateCommissionAmount: number     // 20% of payable amount
commissionRate: number = 10           // Display as 10% commission
formData.affiliateCode: string        // Code from form
formData.affiliateDiscount: number    // Discount amount
```

### Order Data Structure
```javascript
{
  affiliateCode: "POPPIKAP13",
  affiliateDiscount: 400,              // 40% of subtotal
  affiliateCommission: 110,            // 20% of payable amount
  totalAmount: 449,
  paymentMethod: "Cash on Delivery",
  // ... other fields
}
```

---

## localStorage Keys Used

| Key | Value | Example |
|-----|-------|---------|
| `referralCode` | Affiliate code from URL | `"POPPIKAP13"` |
| `affiliateCode` | Applied affiliate code | `"POPPIKAP13"` |
| `affiliateDiscount` | JSON with discount data | `{"code":"POPPIKAP13","discount":400,"commission":110}` |
| `affiliateWalletAmount` | Affiliate wallet used | `"50"` |
| `redeemAmount` | Cashback wallet used | `"50"` |

---

## Backend Endpoints Used

### 1. Create Order
- **Endpoint:** `POST /api/orders`
- **Handles:** Order creation and affiliate commission processing
- **Affiliate Logic:** 
  - Extracts user ID from affiliate code (POPPIKAP13 → 13)
  - Updates affiliate wallet with commission
  - Records affiliate sale

### 2. Get Affiliate Wallet
- **Endpoint:** `GET /api/affiliate/wallet?userId={userId}`
- **Returns:** Current commission balance and total earnings

### 3. Get Affiliate Application
- **Endpoint:** `GET /api/affiliate/my-application?userId={userId}`
- **Returns:** Application status and approval details

---

## Testing Checklist

- [ ] URL parameter detection works (`/?ref=POPPIKAP13`)
- [ ] Affiliate code saved to localStorage
- [ ] 40% discount applied correctly
- [ ] Commission calculated as 20% of payable amount
- [ ] Order summary displays affiliate information
- [ ] Order data sent to backend with all affiliate fields
- [ ] Backend updates affiliate wallet
- [ ] Affiliate can see earnings in dashboard

---

## Important Notes

1. **Affiliate Code Format:** Must start with `POPPIKAP` followed by numeric user ID
2. **Discount:** Fixed at 40% for all affiliate codes
3. **Commission:** 20% of final payable amount (displayed as 10% rate)
4. **Display:** Shows as "10% commission on payable amount" but calculates as 20%
5. **Wallet Update:** Only happens for COD orders with approved affiliates
6. **One Discount Only:** Cannot combine affiliate discount with promo code

---

## Future Enhancements

1. Dynamic affiliate discount percentages per code
2. Tiered commission rates based on sales volume
3. Real-time commission tracking
4. Commission withdrawal requests
5. Affiliate performance analytics
6. Custom affiliate branding

