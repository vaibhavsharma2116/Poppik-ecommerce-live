import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, lt, lte } from 'drizzle-orm';
import * as schema from '../shared/schema';
import { pool } from './storage';
import dotenv from 'dotenv';
dotenv.config();

const rawInterval = process.env.EXPIRE_SCHEDULER_INTERVAL_MS || '';
let INTERVAL_MS = 5 * 60 * 1000; // default 5 minutes
if (rawInterval) {
  const parsed = parseInt(rawInterval, 10);
  if (!isNaN(parsed) && parsed > 0) {
    INTERVAL_MS = parsed < 1000 ? parsed * 1000 : parsed;
  }
}

const ENABLED = (process.env.EXPIRE_SCHEDULER_ENABLED || 'true').toLowerCase() === 'true';

const db = drizzle(pool, { schema });
let intervalHandle: NodeJS.Timeout | null = null;

async function expireEntities() {
  try {
    const now = new Date();

    // Expire offers whose validUntil passed and are still active
    const expiredOffers = await db
      .update(schema.offers)
      .set({ isActive: false })
      .where(and(lt(schema.offers.validUntil, now), eq(schema.offers.isActive, true)))
      .returning();

    // Expire contests whose validUntil passed and are still active
    const expiredContests = await db
      .update(schema.contests)
      .set({ isActive: false })
      .where(and(lt(schema.contests.validUntil, now), eq(schema.contests.isActive, true)))
      .returning();

    // Optionally, activate entities when validFrom has arrived
    const activatedOffers = await db
      .update(schema.offers)
      .set({ isActive: true })
      .where(and(lte(schema.offers.validFrom, now), eq(schema.offers.isActive, false)))
      .returning();

    const activatedContests = await db
      .update(schema.contests)
      .set({ isActive: true })
      .where(and(lte(schema.contests.validFrom, now), eq(schema.contests.isActive, false)))
      .returning();

    const expiredCount = ((expiredOffers as any) || []).length + ((expiredContests as any) || []).length;
    const activatedCount = ((activatedOffers as any) || []).length + ((activatedContests as any) || []).length;

    if (expiredCount > 0 || activatedCount > 0) {
      console.log(`ExpireScheduler: expired=${expiredCount} activated=${activatedCount}`);
    }
  } catch (err: any) {
    console.error('ExpireScheduler error:', err && err.message ? err.message : err);
  }
}

export function startExpireScheduler() {
  if (!ENABLED) {
    console.log('Expire scheduler disabled. Enable with EXPIRE_SCHEDULER_ENABLED=true');
    return;
  }
  if (intervalHandle) return;
  console.log(`Starting expire scheduler (interval ${INTERVAL_MS} ms)`);
  void expireEntities();
  intervalHandle = setInterval(() => void expireEntities(), INTERVAL_MS);
}

export function stopExpireScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('Expire scheduler stopped');
  }
}

export default { startExpireScheduler, stopExpireScheduler };

// Run a single pass on demand (useful for admin-triggered runs/tests)
export async function runExpirePassOnce() {
  await expireEntities();
}
