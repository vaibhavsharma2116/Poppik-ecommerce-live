# Cashfree Payment Gateway Setup Guide

## Error: "transactions are not enabled for your payment gateway account"

This error means your Cashfree merchant account doesn't have transactions enabled. Follow these steps to fix it:

### Step 1: Enable Transactions in Cashfree Dashboard

1. **Log in to Cashfree Dashboard**
   - Go to https://dashboard.cashfree.com (for production)
   - Or https://sandbox.cashfree.com (for testing)

2. **Navigate to Account Settings**
   - Click on your profile/account menu (top right)
   - Select "Settings" or "Account Settings"

3. **Find Payment Features**
   - Look for "Payment Methods" or "Features"
   - Look for "Enable Transactions" or "Transaction Support"
   - Enable it if it's disabled

4. **Verify API Credentials**
   - Copy your **App ID** (also called Client ID)
   - Copy your **Secret Key** (also called Client Secret)

### Step 2: Update Environment Variables

Update your `.env` file with the correct Cashfree credentials:

```bash
# For Sandbox (Testing)
CASHFREE_APP_ID=your_sandbox_app_id
CASHFREE_SECRET_KEY=your_sandbox_secret_key
CASHFREE_BASE_URL=sandbox

# For Production
CASHFREE_APP_ID=your_production_app_id
CASHFREE_SECRET_KEY=your_production_secret_key
CASHFREE_BASE_URL=production
```

**Important:** Make sure you're using either **all sandbox credentials** OR **all production credentials**. Mixing them will cause errors.

### Step 3: Verify Customer Details Format

The payment request should send customer details in this format:

```json
{
  "amount": 237,
  "orderId": "ORD-1765472173169-11",
  "currency": "INR",
  "customerDetails": {
    "customerId": "11",
    "customerName": "Vaibhav Sharma",
    "customerEmail": "yogesh@gmail.com",
    "customerPhone": "7412911516"
  },
  "orderData": { ... },
  "orderNote": "Beauty Store Purchase"
}
```

**Important Rules:**
- `customerPhone` must be 10+ digits (valid phone format)
- `customerEmail` must be valid email format
- `customerId` will be converted to string
- All whitespace will be trimmed automatically

### Step 4: Test Payment Creation

1. Restart your server to load new environment variables:
   ```bash
   npm run dev
   ```

2. Try creating a payment with the corrected request:
   ```bash
   curl -X POST http://localhost:3000/api/payments/cashfree/create-order \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 237,
       "orderId": "ORD-1765472173169-11",
       "currency": "INR",
       "customerDetails": {
         "customerId": "11",
         "customerName": "Vaibhav Sharma",
         "customerEmail": "yogesh@gmail.com",
         "customerPhone": "7412911516"
       },
       "orderNote": "Beauty Store Purchase"
     }'
   ```

### Step 5: Troubleshooting Response

If you still get an error, check the response details:

- **Error: `request_failed`** - Your credentials might be wrong or transactions aren't enabled
- **Error: `invalid_request_error`** - There's an issue with the payload format
- **Error: `INVALID_API_KEY`** - App ID or Secret Key is incorrect
- **Error: `403 Forbidden`** - Check if credentials match the environment (sandbox vs production)

### Step 6: Verify in Server Logs

After you trigger a payment, check your server console logs for:

```
Creating Cashfree order with credentials: {
  appId: "...",
  mode: "sandbox" OR "production",
  baseUrl: "https://sandbox.cashfree.com" OR "https://api.cashfree.com"
}

Cashfree API URL: https://sandbox.cashfree.com/pg/orders
Cashfree payload: { ... }

Cashfree API response status: 200 or error code
Cashfree API response: { ... }
```

## Common Issues

### Issue 1: API Returns 400 Error
- ✅ Verify customer email is valid
- ✅ Verify customer phone is 10+ digits
- ✅ Verify amount is a number > 0
- ✅ Verify orderId format is correct

### Issue 2: API Returns 401/403 Error
- ❌ App ID or Secret Key is wrong
- ❌ Credentials are for different environment (sandbox vs production mismatch)
- ❌ Transactions feature not enabled in dashboard

### Issue 3: "transactions are not enabled"
- ✅ Go to Cashfree Dashboard → Account Settings
- ✅ Enable transactions/payments feature
- ✅ Contact Cashfree support if feature is grayed out

## API Request Structure (Updated)

The code now automatically:
- ✅ Validates customer phone (minimum 10 digits)
- ✅ Trims whitespace from name and email
- ✅ Converts IDs to string format
- ✅ Truncates order note to 255 characters
- ✅ Uses correct API version header (2023-08-01)
- ✅ Sends proper authentication headers

## Cashfree API Documentation

- **Sandbox Dashboard:** https://sandbox.cashfree.com
- **Production Dashboard:** https://dashboard.cashfree.com
- **API Docs:** https://docs.cashfree.com/api-reference/payments/orders/create-order
- **Support:** https://support.cashfree.com

---

If you continue to have issues, please:
1. Check your Cashfree dashboard for account status
2. Verify transactions are enabled for your account
3. Contact Cashfree support with your App ID
4. Check server logs for exact error messages
