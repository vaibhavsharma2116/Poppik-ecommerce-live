# Affiliate Flow - Complete Testing Guide

## Pre-Testing Checklist

- [ ] Database is running
- [ ] Backend server is running (`npm run dev`)
- [ ] Frontend is running (`npm run dev`)
- [ ] Browser DevTools open (for console logs)
- [ ] Network tab open (to inspect API calls)
- [ ] Test affiliate account created and approved
- [ ] Test products added to system

---

## Test Case 1: URL Parameter Detection

### Objective
Verify that affiliate code from URL is detected and stored

### Steps

1. **Open Application with Affiliate Link**
   ```
   Go to: http://localhost:5173/?ref=POPPIKAP13
   ```

2. **Observe Initial Behavior**
   - [ ] Page loads without errors
   - [ ] Toast appears: "Affiliate Code Found"
   - [ ] Toast text shows: "Affiliate code POPPIKAP13 has been saved"

3. **Verify localStorage**
   - Open DevTools Console
   - Run: `localStorage.getItem('referralCode')`
   - [ ] Returns: `"POPPIKAP13"`

4. **Check Component State**
   - Inspect cart component
   - [ ] `affiliateCode` state should be `"POPPIKAP13"`

5. **Refresh Page**
   - [ ] Affiliate code persists in localStorage
   - [ ] No toast on refresh (already saved)

### Expected Result
✅ Affiliate code POPPIKAP13 detected, stored in localStorage, and ready to apply

---

## Test Case 2: Apply Affiliate Code in Cart

### Objective
Verify that affiliate code applies 40% discount correctly

### Steps

1. **Add Product to Cart**
   - Browse to a product
   - Set price: ₹1000 (original price)
   - Add 1 item to cart
   - [ ] Cart shows 1 item

2. **View Cart Summary**
   - Go to `/cart` page
   - [ ] Subtotal shows: ₹1000
   - [ ] No discount applied yet

3. **Apply Affiliate Code**
   - In "Promo Code" field, enter: `POPPIKAP13`
   - Click "Apply" button
   - [ ] Toast appears: "Affiliate Discount Applied!"
   - [ ] Toast shows: "You saved ₹400 with affiliate code POPPIKAP13 (40%)"

4. **Verify Cart Summary**
   - [ ] Line shows: "Applied Affiliate Code: POPPIKAP13 (Save ₹400)"
   - [ ] Discount displays: "Affiliate Discount (POPPIKAP13) - ₹400"
   - [ ] Order Summary updates:
     - Subtotal: ₹1000
     - Affiliate Discount: -₹400
     - Total: ~₹600 (with shipping)

5. **Check localStorage**
   - Run: `JSON.parse(localStorage.getItem('affiliateDiscount'))`
   - [ ] Returns:
     ```javascript
     {
       code: "POPPIKAP13",
       discount: 400,
       discountPercentage: 40
     }
     ```

### Expected Result
✅ 40% discount applied, UI updated, data stored in localStorage

---

## Test Case 3: Commission Calculation

### Objective
Verify that affiliate commission is calculated as 20% of payable amount

### Steps

1. **Setup Test Scenario**
   - Subtotal: ₹1000
   - Product discount: ₹100
   - Affiliate discount (40%): ₹400
   - Promo discount: ₹0
   - Cashback redeemed: ₹50
   - Affiliate wallet redeemed: ₹50
   - Shipping: ₹99

2. **Calculate Expected Commission**
   ```
   Subtotal after product discount: ₹900
   After affiliate discount (40% of 1000): ₹500
   After cashback: ₹450
   After affiliate wallet: ₹400
   After shipping: ₹499
   
   Commission: ₹499 × 20% = ₹99.80 ≈ ₹100
   ```

3. **Apply Discount in Cart**
   - Add products to reach ₹1000 subtotal
   - Apply affiliate code POPPIKAP13
   - Apply product discounts if available

4. **Proceed to Checkout**
   - Click "Proceed to Checkout"
   - Open DevTools Console
   - Check console logs for state being passed

5. **Verify Commission on Checkout**
   - [ ] Order Summary shows affiliate discount
   - [ ] Commission box appears with calculated value
   - [ ] Display shows: "Affiliate Earns ₹100"
   - [ ] Sub-text shows: "10% commission on payable amount"

6. **Check State Passed to Checkout**
   - In browser: `sessionStorage` or inspect component props
   - [ ] `affiliateCommission` matches calculated value

### Expected Result
✅ Commission calculated correctly as 20% of payable amount

---

## Test Case 4: Cannot Combine Affiliate + Promo

### Objective
Verify that affiliate and promo codes cannot be combined

### Steps

1. **Apply Affiliate Code First**
   - Add product (₹1000)
   - Apply: `POPPIKAP13`
   - [ ] Affiliate discount applied

2. **Try to Apply Promo Code**
   - Enter promo code: `SAVE10`
   - Click Apply
   - [ ] Toast error appears
   - [ ] Message: "Cannot Apply Promo Code"
   - [ ] Details: "Please remove the affiliate code first..."
   - [ ] Promo is NOT applied

3. **Reverse: Apply Promo First**
   - Clear affiliate: Click "Remove" on discount
   - [ ] Affiliate code removed

4. **Apply Promo Code**
   - Enter: `SAVE10`
   - Click Apply
   - [ ] Promo applied successfully

5. **Try to Apply Affiliate**
   - Enter: `POPPIKAP13`
   - Click Apply
   - [ ] Toast error appears
   - [ ] Message: "Cannot Apply Affiliate Code"
   - [ ] Details: "Please remove the promo code first..."

### Expected Result
✅ Only one discount type can be active at a time

---

## Test Case 5: Order Placement with Affiliate

### Objective
Verify that order is created with all affiliate data

### Steps

1. **Setup Cart**
   - Add product: ₹1000
   - Apply affiliate code: `POPPIKAP13`
   - [ ] Discount: ₹400
   - [ ] Commission: ₹100 (approx)

2. **Fill Checkout Form**
   - Email: `test@example.com`
   - Name: `Test User`
   - Address: `123 Main St`
   - City: `Mumbai`
   - State: `Maharashtra`
   - Pincode: `400001`
   - Phone: `9876543210`
   - Payment: `Cash on Delivery`

3. **Inspect Network Request**
   - Open Network tab in DevTools
   - Click "Place Order"
   - Wait for POST /api/orders request
   - [ ] Request shows:
     - `affiliateCode: "POPPIKAP13"`
     - `affiliateDiscount: 400`
     - `affiliateCommission: 100`
     - `totalAmount: 549` (or appropriate amount)

4. **Check Request Body**
   ```json
   {
     "affiliateCode": "POPPIKAP13",
     "affiliateDiscount": 400,
     "affiliateCommission": 100,
     "totalAmount": 549,
     ...
   }
   ```
   - [ ] All affiliate fields present
   - [ ] Values are correct

5. **Verify Response**
   - [ ] Response status: 200
   - [ ] Response includes: `orderId`
   - [ ] Order confirmation page shows

### Expected Result
✅ Order created with correct affiliate data sent to backend

---

## Test Case 6: Backend Wallet Update

### Objective
Verify that affiliate wallet is updated with commission

### Steps

1. **Place Order with Affiliate**
   - Complete Test Case 5
   - [ ] Order placed successfully

2. **Check Database**
   - Query affiliate wallet table:
     ```sql
     SELECT * FROM affiliateWallet WHERE userId = 13;
     ```
   - For first order:
     - [ ] `commissionBalance`: ₹100
     - [ ] `totalEarnings`: ₹100
     - [ ] `totalWithdrawn`: ₹0

3. **Place Second Order**
   - Repeat Test Case 5 with another product
   - [ ] New commission: ₹120

4. **Check Wallet Again**
   - Query same table:
     ```sql
     SELECT * FROM affiliateWallet WHERE userId = 13;
     ```
   - [ ] `commissionBalance`: ₹220 (100 + 120)
   - [ ] `totalEarnings`: ₹220
   - [ ] `totalWithdrawn`: ₹0

5. **Check affiliateSales Table**
   ```sql
   SELECT * FROM affiliateSales WHERE affiliateUserId = 13;
   ```
   - [ ] Two records for two orders
   - [ ] Each has correct `saleAmount`

### Expected Result
✅ Affiliate wallet updated correctly after each order

---

## Test Case 7: Checkout Page Display

### Objective
Verify all affiliate information displays correctly on checkout

### Steps

1. **Go to Checkout with Affiliate**
   - Add product and apply affiliate code
   - Proceed to checkout

2. **Verify Order Summary**
   - [ ] Shows: "Subtotal (10 items) ₹1000"
   - [ ] Shows: "Affiliate Discount (POPPIKAP13) -₹400"
   - [ ] Shows: "Total ₹600"

3. **Verify Affiliate Earnings Box**
   - [ ] Purple gradient box visible
   - [ ] Shows: "🏆 Affiliate Earns"
   - [ ] Shows: "₹100"
   - [ ] Shows: "10% commission on payable amount"

4. **Verify Form Prefill**
   - [ ] `affiliateCode` in form: "POPPIKAP13"
   - [ ] `affiliateDiscount` in form: 400

### Expected Result
✅ All affiliate information displayed correctly on checkout

---

## Test Case 8: Invalid Affiliate Codes

### Objective
Verify that invalid codes are rejected

### Steps

1. **Try Invalid Format**
   - Enter: `INVALID123`
   - Click Apply
   - [ ] Toast error: "Invalid Affiliate Code"
   - [ ] Message: "must start with POPPIKAP"

2. **Try Empty Code**
   - Click Apply (empty field)
   - [ ] Toast error: "Empty Promo Code"
   - [ ] Message: "Please enter a promo code"

3. **Try Random POPPIKAP Code**
   - Enter: `POPPIKAP999999`
   - Click Apply
   - [ ] Backend should not find affiliate
   - [ ] Order should process but no commission added

### Expected Result
✅ Invalid codes handled gracefully

---

## Test Case 9: Multiple Products with Affiliate

### Objective
Verify discount applies to all products

### Steps

1. **Add Multiple Products**
   - Product 1: ₹500 (Qty: 2)
   - Product 2: ₹300 (Qty: 1)
   - Product 3: ₹200 (Qty: 1)
   - [ ] Subtotal: ₹1300

2. **Apply Affiliate Code**
   - Enter: `POPPIKAP13`
   - [ ] Discount: ₹520 (40% of 1300)

3. **Verify Each Item**
   - [ ] Each product still shows individual prices
   - [ ] Total discount applies to cart subtotal

4. **Place Order**
   - All items should be in order with affiliate data

### Expected Result
✅ Affiliate discount applies to entire cart subtotal

---

## Test Case 10: Affiliate Link via Email

### Objective
Verify affiliate link can be shared and works

### Steps

1. **Create Affiliate Link**
   - Affiliate code: `POPPIKAP13`
   - Link: `https://example.com/?ref=POPPIKAP13`

2. **Open in New Incognito Window**
   - [ ] Affiliate code detected
   - [ ] Saved to localStorage

3. **Complete Purchase Flow**
   - Add product
   - Apply code
   - Place order
   - [ ] Commission calculated and added

### Expected Result
✅ Affiliate link works end-to-end

---

## Test Case 11: Affiliate Dashboard (Future)

### Objective
Verify affiliate can see earnings (if dashboard exists)

### Steps

1. **Login as Affiliate**
   - User ID: 13

2. **Go to Affiliate Dashboard**
   - [ ] Shows total commission
   - [ ] Shows recent sales

3. **Verify Commission Amounts**
   - [ ] Total matches wallet table
   - [ ] Each sale listed with amount

### Expected Result
✅ Dashboard shows correct commission data

---

## Test Case 12: Mobile Responsiveness

### Objective
Verify affiliate features work on mobile

### Steps

1. **Open on Mobile Device**
   - Use browser DevTools device emulation
   - iPhone 12, Portrait mode

2. **Test Full Flow**
   - [ ] URL parameter works
   - [ ] Affiliate code can be entered
   - [ ] Discount displays correctly
   - [ ] Commission shows on checkout
   - [ ] Order can be placed

3. **Verify UI**
   - [ ] Affiliate info box responsive
   - [ ] Text readable
   - [ ] Buttons clickable

### Expected Result
✅ All features work on mobile

---

## Debugging Guide

### Common Issues

**Issue: Affiliate code not detected from URL**
```
Solution:
1. Check URL format: ?ref=POPPIKAP13 (exact case)
2. Check browser console for errors
3. Verify localStorage is enabled
4. Check URLSearchParams support
```

**Issue: Commission not calculated**
```
Solution:
1. Verify payableAmount > 0
2. Check if affiliate discount applied
3. Verify no errors in console
4. Check calculation: payableAmount * 0.20
```

**Issue: Affiliate code not sent to backend**
```
Solution:
1. Check Network tab request body
2. Verify affiliateCode field exists
3. Check affiliate code validation
4. Verify JSON serialization
```

**Issue: Wallet not updated**
```
Solution:
1. Check affiliate status in DB (must be "approved")
2. Verify affiliate ID extraction from code
3. Check database connection
4. Review backend logs
```

---

## Performance Testing

### Load Time Impact
```
With affiliate code logic:
- URL parsing: <1ms
- localStorage operations: <5ms
- Commission calculation: <1ms
Total: <10ms impact (negligible)
```

### Test Steps
1. Open DevTools Performance tab
2. Complete affiliate flow
3. Check timeline for performance

---

## Acceptance Criteria

All tests should pass:

- [ ] Test 1: URL parameter detection ✅
- [ ] Test 2: Affiliate code application ✅
- [ ] Test 3: Commission calculation ✅
- [ ] Test 4: Discount exclusivity ✅
- [ ] Test 5: Order placement ✅
- [ ] Test 6: Wallet update ✅
- [ ] Test 7: Display on checkout ✅
- [ ] Test 8: Invalid codes ✅
- [ ] Test 9: Multiple products ✅
- [ ] Test 10: Link sharing ✅
- [ ] Test 11: Dashboard (if applicable) ✅
- [ ] Test 12: Mobile responsiveness ✅

---

## Sign-Off

**Date:** ________________
**Tester:** ________________
**Result:** ✅ PASS / ❌ FAIL

**Issues Found:**
1. _____________________
2. _____________________
3. _____________________

**Notes:**
_________________________________
_________________________________
_________________________________

