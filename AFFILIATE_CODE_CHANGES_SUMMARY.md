# Affiliate Flow - Code Changes Summary

## Files Modified

### 1. `client/src/pages/cart.tsx`

#### Changes Made:

**A. Added URL Parameter Detection in useEffect (Line ~120)**
```javascript
// Check for affiliate code in URL parameters
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode && refCode.toUpperCase().startsWith('POPPIKAP')) {
  // Store affiliate code in localStorage for later use
  localStorage.setItem('referralCode', refCode.toUpperCase());
  
  // Also set it in state so it can be applied
  setAffiliateCode(refCode.toUpperCase());
  
  toast({
    title: "Affiliate Code Found",
    description: `Affiliate code ${refCode.toUpperCase()} has been saved. Apply it in your cart to get the discount!`,
  });
} else if (localStorage.getItem('referralCode')) {
  // Load saved affiliate code from previous visit
  const savedRefCode = localStorage.getItem('referralCode');
  if (savedRefCode) {
    setAffiliateCode(savedRefCode);
  }
}
```

**B. Enhanced applyAffiliateCode Function (Line ~450)**
- Added validation for affiliate code format (must start with POPPIKAP)
- Added error toasts for better user feedback
- Enhanced localStorage storage with discount percentage
- Prevents promo codes when affiliate code is applied

**Before:**
```javascript
const applyAffiliateCode = (code: string) => {
  const trimmedCode = code.trim().toUpperCase();
  if (!trimmedCode) {
    return;
  }
  // ... minimal validation
};
```

**After:**
```javascript
const applyAffiliateCode = (code: string) => {
  const trimmedCode = code.trim().toUpperCase();

  if (!trimmedCode) {
    toast({
      title: "Invalid Code",
      description: "Please enter a valid affiliate code",
      variant: "destructive",
    });
    return;
  }

  // Check if promo code is already applied
  if (appliedPromo) {
    toast({
      title: "Cannot Apply Affiliate Code",
      description: "Please remove the promo code first. You can only use one discount at a time.",
      variant: "destructive",
    });
    return;
  }

  // Validate affiliate code format
  if (!trimmedCode.startsWith('POPPIKAP')) {
    toast({
      title: "Invalid Affiliate Code",
      description: "Affiliate code must start with POPPIKAP",
      variant: "destructive",
    });
    return;
  }

  const userDiscountPercentage = 40;
  let discountAmount = (cartSubtotal * userDiscountPercentage) / 100;

  setAppliedPromo(null);
  setAffiliateCode(trimmedCode);
  setAffiliateDiscount(discountAmount);
  setPromoCode('');
  setPromoDiscount(0);

  localStorage.setItem('affiliateCode', trimmedCode);
  localStorage.setItem('referralCode', trimmedCode);
  localStorage.setItem('affiliateDiscount', JSON.stringify({ 
    discount: discountAmount, 
    code: trimmedCode,
    discountPercentage: userDiscountPercentage
  }));

  toast({
    title: "Affiliate Discount Applied!",
    description: `You saved ₹${Math.round(discountAmount).toLocaleString()} with affiliate code ${trimmedCode} (${userDiscountPercentage}%)`,
  });
};
```

**C. Updated handleCheckout Function (Line ~630)**
- Added affiliate commission calculation: **20% of payable amount**
- Pass commission to checkout page in state

**Before:**
```javascript
const handleCheckout = () => {
  // ... validation code ...
  
  setLocation("/checkout", {
    state: {
      items: cartItems,
      walletAmount,
      affiliateWalletAmount,
      promoCode: appliedPromo,
      promoDiscount: generalPromoDiscount,
      affiliateCode: affiliateCode,
      affiliateDiscount: affiliateDiscount,
    }
  });
};
```

**After:**
```javascript
const handleCheckout = () => {
  // ... validation code ...
  
  // Calculate affiliate commission: 20% of the final payable amount
  let affiliateCommission = 0;
  if (affiliateDiscount > 0 && affiliateCode) {
    // Commission is 20% of the payable amount (amount after all discounts)
    const payableAmount = Math.max(0, subtotalAfterDiscount - walletAmount - affiliateWalletAmount);
    affiliateCommission = payableAmount * 0.20; // 20% of payable amount
  }

  // Save affiliate discount and commission to localStorage if applied
  if (affiliateDiscount > 0 && affiliateCode) {
    localStorage.setItem('affiliateDiscount', JSON.stringify({
      code: affiliateCode,
      discount: affiliateDiscount,
      commission: affiliateCommission  // ✅ NEW
    }));
  } else {
    localStorage.removeItem('affiliateDiscount');
  }

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
};
```

---

### 2. `client/src/pages/checkout.tsx`

#### Changes Made:

**A. Updated State Destructuring (Line ~52)**
```javascript
// BEFORE
const { items = [], walletAmount: passedWalletAmount = 0, affiliateWalletAmount: passedAffiliateWalletAmount = 0, promoCode = null, promoDiscount: passedPromoDiscount = 0, affiliateCode: passedAffiliateCode = "", affiliateDiscount: passedAffiliateDiscount = 0 } = (location as any).state || {};

// AFTER
const { items = [], walletAmount: passedWalletAmount = 0, affiliateWalletAmount: passedAffiliateWalletAmount = 0, promoCode = null, promoDiscount: passedPromoDiscount = 0, affiliateCode: passedAffiliateCode = "", affiliateDiscount: passedAffiliateDiscount = 0, affiliateCommission: passedAffiliateCommission = 0 } = (location as any).state || {};
```

**B. Added Affiliate Commission State (Line ~110)**
```javascript
// Affiliate commission state - load from props or localStorage
const [affiliateCommissionAmount, setAffiliateCommissionAmount] = useState(() => {
  // Try to get from passed props first
  if (passedAffiliateCommission > 0) {
    return passedAffiliateCommission;
  }
  // Then try localStorage
  const savedAffiliateDiscount = localStorage.getItem('affiliateDiscount');
  if (savedAffiliateDiscount) {
    try {
      const affiliateData = JSON.parse(savedAffiliateDiscount);
      return affiliateData.commission || 0;
    } catch (error) {
      console.error('Error parsing affiliate commission:', error);
      return 0;
    }
  }
  return 0;
});
```

**C. Updated Commission Calculation (Line ~620)**
```javascript
// BEFORE
const commissionRate = 10;
const affiliateCommission = formData.affiliateCode
  ? Math.round(total * (commissionRate / 100))
  : 0;

// AFTER
// Use affiliate commission from cart if available, otherwise calculate as 10% of total
const commissionRate = 10;
const affiliateCommission = affiliateCommissionAmount > 0 
  ? affiliateCommissionAmount
  : (formData.affiliateCode ? Math.round(total * (commissionRate / 100)) : 0);
```

**Why the change?**
- Uses the more accurate 20% of payable amount calculation from cart
- Falls back to 10% of total if not provided
- Ensures consistency between cart and checkout

**D. Order Data includes affiliateCommission (Already in place)**
```javascript
const orderData = {
  userId: user.id,
  totalAmount: Math.round(total),
  // ... other fields ...
  affiliateCode: formData.affiliateCode || passedAffiliateCode || null,
  affiliateCommission: affiliateCommission > 0 ? Math.round(affiliateCommission) : null,  // ✅ Passed to backend
  affiliateDiscount: affiliateDiscountAmount > 0 ? Math.round(affiliateDiscountAmount) : null,
  // ...
};
```

---

### 3. `server/routes.ts` (Already Implemented)

**No changes needed** - Backend already has:

✅ Order creation with affiliate fields
```typescript
const newOrderData = {
  userId: Number(userId),
  totalAmount: Number(totalAmount),
  affiliateCode: affiliateCode || null,
  affiliateDiscount: affiliateDiscount ? Math.round(affiliateDiscount) : 0,
  // ...
};
```

✅ Affiliate wallet update logic
```typescript
if (affiliateCode && affiliateCode.startsWith('POPPIKAP') && paymentMethod === 'Cash on Delivery') {
  const affiliateUserId = parseInt(affiliateCode.replace('POPPIKAP', ''));
  // ... wallet update logic
}
```

✅ Commission processing
```typescript
const calculatedCommission = affiliateCommission || 0;
if (calculatedCommission > 0) {
  // Update affiliate wallet with commission
}
```

---

## Key Formulas

### 1. Affiliate Discount
```
Discount = Subtotal × 40%
```

### 2. Payable Amount
```
Payable = Subtotal - Product Discount - Affiliate Discount 
          - Promo Discount - Cashback - Affiliate Wallet + Shipping
```

### 3. Affiliate Commission
```
Commission = Payable Amount × 20%
```

### 4. Display Commission
```
Display = Commission ÷ 2  (Shows as 10%)
```

---

## Integration Points

### localStorage Keys
| Key | Created in | Used in |
|-----|-----------|---------|
| `referralCode` | cart.tsx (URL detect) | cart.tsx (state) |
| `affiliateCode` | cart.tsx (apply) | cart.tsx (apply), checkout.tsx (load) |
| `affiliateDiscount` | cart.tsx (apply) | cart.tsx (apply), checkout.tsx (load) |

### State Flow
```
cart.tsx state
  ↓
handleCheckout → setLocation("/checkout", { state: {...} })
  ↓
checkout.tsx destructures state
  ↓
Displays in Order Summary
  ↓
Sends to backend in orderData
```

### Backend Integration
```
POST /api/orders with orderData
  ↓
Create order with affiliate fields
  ↓
Extract userId from affiliateCode
  ↓
Update affiliateWallet
  ↓
Record affiliateSales
```

---

## Testing the Changes

### Test 1: URL Parameter Detection
```javascript
// Go to: http://localhost:5173/?ref=POPPIKAP13
// Expected: Toast shows "Affiliate Code Found"
// localStorage['referralCode'] === "POPPIKAP13"
```

### Test 2: Apply Affiliate Code
```javascript
// In cart, enter: POPPIKAP13
// Click Apply
// Expected: 40% discount applied
// localStorage['affiliateDiscount'] contains commission value
```

### Test 3: Checkout Display
```javascript
// Go to checkout
// Expected: Order Summary shows:
// - Affiliate Discount (POPPIKAP13)
// - Affiliate Earns: ₹XXX (10% commission)
```

### Test 4: Order Creation
```javascript
// Place order
// Check Network tab:
// POST /api/orders includes:
// - affiliateCode: "POPPIKAP13"
// - affiliateDiscount: 400
// - affiliateCommission: 110
```

### Test 5: Backend Processing
```javascript
// After order placed
// Check database:
// 1. orders table has affiliateCode, affiliateDiscount
// 2. affiliateWallet updated with commission
// 3. affiliateSales has new record
```

---

## Rollback Instructions

If needed to rollback changes:

### Revert cart.tsx
1. Remove URL parameter detection in useEffect
2. Revert applyAffiliateCode to minimal validation
3. Remove commission calculation from handleCheckout

### Revert checkout.tsx
1. Remove affiliateCommissionAmount state
2. Revert commission calculation to simple 10%
3. Commission will still be passed but not calculated from cart

### Backend (No changes needed)
- Backend already handles commission, no rollback needed

---

## Performance Impact

| Change | Impact | Mitigation |
|--------|--------|-----------|
| URL parsing | Minimal (single line in useEffect) | None needed |
| localStorage operations | Minimal (3-4 reads/writes per cart action) | None needed |
| Commission calculation | Minimal (simple math) | None needed |
| Backend query | Minimal (1 additional lookup) | Already optimized |

---

## Browser Compatibility

✅ All features use standard APIs:
- URLSearchParams (ES2015+)
- localStorage (universally supported)
- JSON.stringify/parse (universally supported)
- Modern React hooks

---

## Documentation Files Created

1. `AFFILIATE_FLOW_IMPLEMENTATION_GUIDE.md` - Complete guide
2. `AFFILIATE_API_QUICK_REFERENCE.md` - API examples and quick start
3. `CODE_CHANGES_SUMMARY.md` - This file (specific changes)

---

## Next Steps (Optional Enhancements)

1. Add affiliate dashboard stats
2. Implement commission withdrawal
3. Add affiliate performance tracking
4. Create tiered commission rates
5. Add email notifications for commissions
6. Implement affiliate referral links generator

