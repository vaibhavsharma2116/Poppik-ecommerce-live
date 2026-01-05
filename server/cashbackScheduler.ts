import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, lte, isNotNull } from 'drizzle-orm';
import * as schema from '../shared/schema';
import { pool } from './storage';
import dotenv from 'dotenv';

dotenv.config();

const rawInterval = process.env.CASHBACK_SCHEDULER_INTERVAL_MS || '';
let INTERVAL_MS = 5 * 60 * 1000; // default 5 minutes
if (rawInterval) {
  const parsed = parseInt(rawInterval, 10);
  if (!isNaN(parsed) && parsed > 0) {
    INTERVAL_MS = parsed < 1000 ? parsed * 1000 : parsed;
  }
}

const ENABLED = (process.env.CASHBACK_SCHEDULER_ENABLED || 'true').toLowerCase() === 'true';

const db: any = drizzle(pool, { schema: schema as any });
let intervalHandle: NodeJS.Timeout | null = null;

async function processEligibleCashbacks() {
  try {
    const now = new Date();

    // Delete expired wallet reserves (WOCashback) so they disappear from wallet + DB
    try {
      await db
        .delete(schema.userWalletTransactions as any)
        .where(
          and(
            eq((schema.userWalletTransactions as any).type, 'reserve'),
            eq((schema.userWalletTransactions as any).status, 'pending'),
            lte((schema.userWalletTransactions as any).expiresAt, now)
          )
        );
    } catch (e: any) {
      console.error('CashbackScheduler reserve cleanup error:', e && e.message ? e.message : e);
    }

    const pending = await db
      .select()
      .from(schema.userWalletTransactions as any)
      .where(
        and(
          eq((schema.userWalletTransactions as any).status, 'pending'),
          // Only process scheduler-managed cashbacks (eligibleAt is set). Delivered-based pending cashbacks keep eligibleAt NULL.
          isNotNull((schema.userWalletTransactions as any).eligibleAt),
          lte((schema.userWalletTransactions as any).eligibleAt, now)
        )
      )
      .limit(200);

    if (!pending || pending.length === 0) return;

    for (const tx of pending) {
      if (!tx.orderId) {
        await db
          .update(schema.userWalletTransactions as any)
          .set({ status: 'failed' })
          .where(eq((schema.userWalletTransactions as any).id, tx.id));
        continue;
      }

      let wallet = await db
        .select()
        .from(schema.userWallet as any)
        .where(eq((schema.userWallet as any).userId, tx.userId))
        .limit(1);

      if (!wallet || wallet.length === 0) {
        const [newWallet] = await db
          .insert(schema.userWallet as any)
          .values({
            userId: tx.userId,
            cashbackBalance: '0.00',
            totalEarned: '0.00',
            totalRedeemed: '0.00',
          })
          .returning();
        wallet = [newWallet];
      }

      const currentBalance = parseFloat(wallet[0].cashbackBalance || '0');
      const currentEarned = parseFloat(wallet[0].totalEarned || '0');
      const creditAmount = parseFloat(tx.amount as any);
      const newBalance = currentBalance + creditAmount;

      await db
        .update(schema.userWallet as any)
        .set({
          cashbackBalance: newBalance.toFixed(2),
          totalEarned: (currentEarned + creditAmount).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq((schema.userWallet as any).userId, tx.userId));

      await db
        .update(schema.userWalletTransactions as any)
        .set({
          status: 'completed',
          type: 'credit',
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
        })
        .where(eq((schema.userWalletTransactions as any).id, tx.id));
    }
  } catch (err: any) {
    console.error('CashbackScheduler error:', err && err.message ? err.message : err);
  }
}

export function startCashbackScheduler() {
  if (!ENABLED) {
    console.log('Cashback scheduler disabled. Enable with CASHBACK_SCHEDULER_ENABLED=true');
    return;
  }
  if (intervalHandle) return;

  console.log(`Starting cashback scheduler (interval ${INTERVAL_MS} ms)`);
  void processEligibleCashbacks();
  intervalHandle = setInterval(() => void processEligibleCashbacks(), INTERVAL_MS);
}

export function stopCashbackScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('Cashback scheduler stopped');
  }
}

export default { startCashbackScheduler, stopCashbackScheduler };
