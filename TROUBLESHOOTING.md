# Chunk Loading Error - Quick Troubleshooting Guide

## If the error persists after deployment:

### Step 1: Clear Cache
```powershell
# Clear browser cache or do a hard refresh
# Windows/Linux: Ctrl + Shift + Delete
# Mac: Cmd + Shift + Delete
# Or in DevTools: Ctrl + F5 (or Cmd + Shift + R on Mac)
```

### Step 2: Verify Build Output
```powershell
# Check that dist/public/assets folder contains multiple JS files
dir dist/public/assets/ | Where-Object {$_.Extension -eq '.js'}

# Expected: layout-[hash].js, home-[hash].js, react-vendor-[hash].js, etc.
```

### Step 3: Check Server Configuration
Ensure `.htaccess` is properly configured for SPA routing:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Step 4: Check Network Tab
1. Open DevTools → Network tab
2. Reload the page
3. Look for failed requests (marked in red)
4. Check response status codes:
   - ✅ 200 = Good
   - ❌ 404 = File not found
   - ❌ 500 = Server error
   - ❌ 503 = Server overloaded

### Step 5: Monitor Console
1. Open DevTools → Console tab
2. Look for error messages starting with:
   - `[Chunk Load Error]`
   - `Failed to fetch dynamically imported module`
   - `Failed to fetch`

## Common Issues & Solutions

### Issue: 404 on chunk files
**Cause**: Build folder not deployed correctly
**Solution**: 
```powershell
# Rebuild and ensure dist/public exists
npm run build

# Deploy entire dist/public folder to server
```

### Issue: CORS errors on chunk loading
**Cause**: Chunks served from different domain
**Solution**: Ensure all assets served from same domain with proper CORS headers

### Issue: Stale chunks in browser cache
**Cause**: Old chunks cached before deployment
**Solution**: Users should hard refresh or clear browser cache

### Issue: 503 Server Unavailable
**Cause**: Server overloaded or temporarily down
**Solution**: Wait a moment and retry - auto-retry logic handles this

## Monitoring the Fix

### Check these files were modified:
✅ `vite.config.ts` - Updated chunking strategy
✅ `client/index.html` - Added error handlers & cache control
✅ `client/src/main.tsx` - Added global retry logic
✅ `client/src/App.tsx` - Enhanced error boundaries

### Expected Behavior After Fix:
1. Page loads normally ✓
2. If chunk fails: automatic retry (3 attempts) ✓
3. If all retries fail: user sees error message with reload button ✓
4. No more "Failed to fetch dynamically imported module" error ✓

## Browser Console Messages (Good Signs)
- `[Chunk Load Error] Attempt 1/3` = Auto-retrying (expected)
- `[announcements-ws] connected to ws://...` = WebSocket working
- `[api base] fetch proxy enabled` = API proxy working

## Need More Help?
1. Check `/dist/public/assets/` folder has chunks
2. Verify server is running on correct port
3. Check VITE_API_BASE environment variable if needed
4. Review server logs for any issues
