const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/poppik_local';
const pool = new Pool({ connectionString });

(async () => {
  try {
    console.log('Using DB:', connectionString);

    const totalRes = await pool.query('SELECT COUNT(*)::int AS total FROM users');
    const total = totalRes.rows[0]?.total ?? 0;

    const adminRes = await pool.query("SELECT COUNT(*)::int AS admins FROM users WHERE role IN ('admin','master_admin')");
    const admins = adminRes.rows[0]?.admins ?? 0;

    const masterRes = await pool.query("SELECT id, email, role, created_at, updated_at FROM users WHERE email = $1 LIMIT 1", ['masteradmin@poppiklifestyle.com']);
    const master = masterRes.rows[0] || null;

    console.log('Totals:');
    console.log('  total users:', total);
    console.log('  admin users (role admin|master_admin):', admins);

    if (master) {
      console.log('\nMaster admin row found:');
      console.log(`  id: ${master.id}`);
      console.log(`  email: ${master.email}`);
      console.log(`  role: ${master.role}`);
      console.log(`  created_at: ${master.created_at}`);
      console.log(`  updated_at: ${master.updated_at}`);
    } else {
      console.log('\nNo master admin row found for masteradmin@poppiklifestyle.com');
    }

    // Example: show up to 5 recent admin users
    const recentAdmins = await pool.query("SELECT id, email, role, created_at FROM users WHERE role IN ('admin','master_admin') ORDER BY created_at DESC LIMIT 5");
    console.log('\nRecent admin users:');
    if (recentAdmins.rows.length === 0) console.log('  (none)');
    else recentAdmins.rows.forEach(r => console.log(`  ${r.id} | ${r.email} | ${r.role} | ${r.created_at}`));

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error checking DB:', err.message || err);
    try { await pool.end(); } catch {};
    process.exit(2);
  }
})();
