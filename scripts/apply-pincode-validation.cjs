const fs = require('fs');
const path = require('path');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const repoRoot = path.resolve(__dirname, '..');
const routesPath = path.join(repoRoot, 'server', 'routes.ts');

let s = fs.readFileSync(routesPath, 'utf8');

// Backup once per run
const backupPath = routesPath + '.bak';
fs.writeFileSync(backupPath, s, 'utf8');

const shadesAnchor = 'const shadesCache: Map<string, { expires: number; data: any }> = new Map();';
assert(s.includes(shadesAnchor), 'Anchor shadesCache not found');

const svcAnchor = 'const ithinkService = new IthinkService();';
assert(s.includes(svcAnchor), 'Anchor ithinkService not found');

// 1) Add cache after shadesCache
if (!s.includes('const pincodeExistsCache:')) {
  s = s.replace(
    shadesAnchor,
    shadesAnchor +
      "\n\nconst pincodeExistsCache: Map<string, { expires: number; exists: boolean }> = new Map();"
  );
}

// 2) Add helpers after ithinkService initialization
if (!s.includes('async function validatePincodeBackend')) {
  const helper = [
    '',
    'async function fetchWithTimeout(url: string, init: any, timeoutMs: number) {',
    '  const controller = new AbortController();',
    '  const timeout = setTimeout(() => controller.abort(), timeoutMs);',
    '  try {',
    '    return await fetch(url, { ...(init || {}), signal: controller.signal });',
    '  } finally {',
    '    clearTimeout(timeout);',
    '  }',
    '}',
    '',
    'async function validatePincodeBackend(pincode: string) {',
    "  const normalized = String(pincode || '').trim();",
    '  if (!/^\\d{6}$/.test(normalized)) {',
    "    return { status: 'error', message: 'Invalid pincode format', pincode_valid: false, ithink_deliverable: false, delivery_partner: 'INDIA_POST' as const };",
    '  }',
    '',
    '  const cached = pincodeExistsCache.get(normalized);',
    '  let exists = false;',
    '  if (cached && cached.expires > Date.now()) {',
    '    exists = cached.exists === true;',
    '  } else {',
    '    const apiKey = process.env.DATA_GOV_API_KEY;',
    '    if (!apiKey) {',
    "      return { status: 'error', message: 'Pincode validation service unavailable', pincode_valid: false, ithink_deliverable: false, delivery_partner: 'INDIA_POST' as const };",
    '    }',
    "    const RESOURCE_ID = '5c2f62fe-5afa-4119-a499-fec9d604d5bd';",
    "    const u = new URL('https://api.data.gov.in/resource/' + RESOURCE_ID);",
    "    u.searchParams.set('api-key', apiKey);",
    "    u.searchParams.set('format', 'json');",
    "    u.searchParams.set('filters[pincode]', normalized);",
    "    u.searchParams.set('limit', '1');",
    '    try {',
    "      const resp = await fetchWithTimeout(u.toString(), { method: 'GET' }, 10000);",
    "      if (!resp.ok) throw new Error('data.gov.in HTTP ' + resp.status);",
    '      const json: any = await resp.json();',
    '      const records = json && Array.isArray(json.records) ? json.records : [];',
    '      exists = Array.isArray(records) && records.length > 0;',
    '    } catch (e) {',
    "      console.error('data.gov.in pincode validation failed:', e);",
    "      return { status: 'error', message: 'Pincode validation service unavailable', pincode_valid: false, ithink_deliverable: false, delivery_partner: 'INDIA_POST' as const };",
    '    }',
    '    if (exists) {',
    '      pincodeExistsCache.set(normalized, { exists: true, expires: Date.now() + 24*60*60*1000 });',
    '    }',
    '  }',
    '',
    '  if (!exists) {',
    "    return { status: 'invalid', message: 'Pincode does not exist', pincode_valid: false, ithink_deliverable: false, delivery_partner: 'INDIA_POST' as const };",
    '  }',
    '',
    '  try {',
    "    const pickupPincode = process.env.ITHINK_PICKUP_PINCODE || '400001';",
    '    const defaultWeight = 0.5;',
    '    const cod = false;',
    '    const serviceability = await ithinkService.getServiceability(pickupPincode, normalized, defaultWeight, cod);',
    '    const hasAvailableCouriers = serviceability && (serviceability as any).data && Array.isArray((serviceability as any).data.available_courier_companies) && (serviceability as any).data.available_courier_companies.length > 0;',
    '    if (hasAvailableCouriers) {',
    "      return { status: 'success', message: 'Delivery available', pincode_valid: true, ithink_deliverable: true, delivery_partner: 'ITHINK' as const };",
    '    }',
    "    return { status: 'success', message: 'Delivery available via India Post', pincode_valid: true, ithink_deliverable: false, delivery_partner: 'INDIA_POST' as const };",
    '  } catch (e) {',
    "    console.error('Delivery partner serviceability check failed:', e);",
    "    return { status: 'error', message: 'Pincode validation service unavailable', pincode_valid: false, ithink_deliverable: false, delivery_partner: 'INDIA_POST' as const };",
    '  }',
    '}',
    ''
  ].join('\n');

  s = s.replace(svcAnchor, svcAnchor + helper);
}

// 3) Add endpoint near existing ithink serviceability section
if (!s.includes("app.get('/api/pincode/validate'")) {
  const marker = '  // iThink serviceability endpoint for shipping cost';
  const pos = s.indexOf(marker);
  assert(pos >= 0, 'Insertion marker not found');

  const endpoint = [
    '',
    "  app.get('/api/pincode/validate', async (req, res) => {",
    "    const pincode = String((req.query as any)?.pincode ?? '').trim();",
    '    const result = await validatePincodeBackend(pincode);',
    "    if (result.status === 'error') return res.status(500).json({ status: 'error', message: result.message });",
    "    if (result.status === 'invalid') return res.json({ status: 'invalid', message: result.message, pincode_valid: false });",
    "    return res.json({ status: 'success', message: result.message, pincode_valid: true, ithink_deliverable: result.ithink_deliverable, delivery_partner: result.delivery_partner });",
    '  });',
    ''
  ].join('\n');

  s = s.slice(0, pos) + endpoint + s.slice(pos);
}

// 4) Enforce validation on create
const createNeedle = '      if (!userId || !recipientName || !addressLine1 || !city || !state || !pincode || !phoneNumber) {';
assert(s.includes(createNeedle), 'Create needle not found');
if (!s.includes('const pinResult = await validatePincodeBackend(String(pincode));')) {
  s = s.replace(
    createNeedle,
    createNeedle +
      "\n\n      const pinResult = await validatePincodeBackend(String(pincode));\n      if (pinResult.status !== 'success') {\n        return res.status(400).json({ error: 'Enter valid pincode' });\n      }\n"
  );
}

// 5) Enforce validation on update (insert after req.body destructure)
const updStart = s.indexOf('  app.put("/api/delivery-addresses/:id"');
assert(updStart >= 0, 'Update route not found');
const updNeedle = '      } = req.body;';
const updPos = s.indexOf(updNeedle, updStart);
assert(updPos >= 0, 'Update destructure needle not found');

if (s.indexOf('const pinResult = await validatePincodeBackend(String(pincode));', updStart) < 0) {
  const inject =
    updNeedle +
    "\n\n      if (pincode) {\n        const pinResult = await validatePincodeBackend(String(pincode));\n        if (pinResult.status !== 'success') {\n          return res.status(400).json({ error: 'Enter valid pincode' });\n        }\n      }\n";
  s = s.slice(0, updPos) + inject + s.slice(updPos + updNeedle.length);
}

fs.writeFileSync(routesPath, s, 'utf8');
console.log('✅ Patched server/routes.ts (backup created at server/routes.ts.bak)');
