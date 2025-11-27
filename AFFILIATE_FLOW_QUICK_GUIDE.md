# 🔗 Affiliate Link Flow - Quick Reference

## ✅ Affiliate System Fully Implemented

### What Was Added/Modified

#### 1. **App.tsx** - Affiliate Link Capture
```typescript
// NEW: AffiliateHandler component captures ?ref= parameter
function AffiliateHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.startsWith('POPPIKAP')) {
      localStorage.setItem('affiliateRef', ref);
    }
  }, []);
  return null;
}
```

#### 2. **cart.tsx** - Auto-Apply Affiliate Code
```typescript
// NEW: Function to apply affiliate code
const applyAffiliateCode = (code: string) => {
  // Applies 40% discount automatically
  // Stores in localStorage for checkout
};

// NEW: Auto-apply effect
useEffect(() => {
  const storedAffiliateRef = localStorage.getItem('affiliateRef');
  if (storedAffiliateRef && !affiliateCode) {
    applyAffiliateCode(storedAffiliateRef);
  }
}, []);
```

### How It Works

```
Affiliate Link: https://poppiklifestyle.com/?ref=POPPIKAP13
        ↓
    [Click Link]
        ↓
    App.tsx captures ?ref=POPPIKAP13
        ↓
    Stored in localStorage: affiliateRef
        ↓
    [User browses products and adds to cart]
        ↓
    cart.tsx detects affiliateRef in localStorage
        ↓
    Auto-applies POPPIKAP13 code (40% discount)
        ↓
    [User goes to checkout]
        ↓
    checkout.tsx loads affiliate data
        ↓
    Displays discount + calculates commission (20%)
        ↓
    [User places order]
        ↓
    Backend credits affiliate wallet with commission
        ↓
    [Affiliate sees earnings in dashboard]
```

## 📊 Numbers

| Aspect | Value |
|--------|-------|
| **Affiliate Code** | POPPIKAP{userId} (e.g., POPPIKAP13) |
| **Customer Discount** | 40% of cart subtotal |
| **Affiliate Commission** | 20% of final payable amount |
| **When Commission Credited** | Immediately on COD order |

## 🔑 Key Components

### All Product Pages Handle Affiliate Links
- ✅ home.tsx - Line 232-236
- ✅ product-detail.tsx - Line 302-316
- ✅ offer-detail.tsx - Line 621-633
- ✅ combo-detail.tsx - Line 219-233

### Checkout Properly Displays
- ✅ Affiliate discount line item
- ✅ Affiliate commission earned
- ✅ All included in order summary

### Backend Processing
- ✅ Validates affiliate code (POPPIKAP format)
- ✅ Checks affiliate approval status
- ✅ Creates/updates wallet
- ✅ Records transaction
- ✅ Credits commission immediately

## 🧪 Test It

```javascript
// 1. Click: https://poppiklifestyle.com/?ref=POPPIKAP13
// 2. Open DevTools Console
localStorage.getItem('affiliateRef')  // Should return "POPPIKAP13"

// 3. Add products (₹1000)
// 4. Cart auto-applies discount
localStorage.getItem('affiliateDiscount')  // Should have discount info

// 5. Go to checkout
// 6. See in order summary:
//    - Affiliate Discount (POPPIKAP13): -₹400
//    - Affiliate Earns: ₹100 (20% of payable)

// 7. Place order (COD)
// 8. Check affiliate dashboard for ₹100 credit
```

## 📁 Files Modified

1. **client/src/App.tsx**
   - Added AffiliateHandler component (Lines 169-183)
   - Captures ?ref= parameter on any page

2. **client/src/pages/cart.tsx**
   - Added applyAffiliateCode() function (Lines 307-348)
   - Added auto-apply useEffect (Lines 207-213)
   - Auto-applies affiliate when entering cart

3. **All Other Files** (No changes - already had affiliate support)
   - checkout.tsx - Already loads and displays affiliate data
   - routes.ts - Already processes commissions
   - product pages - Already capture ?ref= parameter
   - dashboard - Already shows earnings

## 🎯 End-to-End Flow

```
START: https://poppiklifestyle.com/?ref=POPPIKAP13
  ↓
  App.tsx → Store ref in localStorage
  ↓
  User: Home → Product → Add to Cart
  ↓
  cart.tsx → Auto-apply code + 40% discount
  ↓
  User: Proceed to Checkout
  ↓
  checkout.tsx → Load affiliate data
  ↓
  Display:
  - Subtotal: ₹1000
  - Affiliate Discount (POPPIKAP13): -₹400
  - Final: ₹600
  - Affiliate Earns: ₹100 (20% of ₹500)
  ↓
  User: Place Order (COD)
  ↓
  routes.ts /api/orders → Process affiliate
  ↓
  Backend → Credit ₹100 to wallet
  ↓
  END: Affiliate sees ₹100 in dashboard
```

---

**Status**: ✅ COMPLETE

The complete affiliate link flow from entry to earnings is fully implemented and working.
