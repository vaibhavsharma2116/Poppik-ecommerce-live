import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema';
import { pool } from './storage';
import webpush from 'web-push';
import dotenv from "dotenv";
dotenv.config();
// Interpret provided interval. If a small number (<1000) is given, assume seconds and convert to ms.
const rawInterval = process.env.PUSH_SCHEDULER_INTERVAL_MS || '';
let INTERVAL_MS = 3 * 60 * 1000; // default 3 minutes
if (rawInterval) {
  const parsed = parseInt(rawInterval, 10);
  if (!isNaN(parsed) && parsed > 0) {
    INTERVAL_MS = parsed < 1000 ? parsed * 1000 : parsed;
  }
}
const ENABLED = (process.env.PUSH_SCHEDULER_ENABLED || 'false').toLowerCase() === 'true';

const db = drizzle(pool, { schema });

let intervalHandle: NodeJS.Timeout | null = null;

async function sendScheduledNotifications() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('⚠️ VAPID keys missing — skipping scheduled notifications');
    return;
  }

  try {
    const subscriptions = await db
      .select()
      .from(schema.pushSubscriptions)
      .where((schema.pushSubscriptions as any).isActive);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No active subscriptions found for scheduled notifications');
      return;
    }

    console.log(`📢 Scheduled: Sending notification to ${subscriptions.length} subscribers...`);

    const payload = {
      title: 'Latest Offers from Poppik',
      body: 'Check out the newest deals — Tap to view!',
      tag: `poppik-scheduled-${Date.now()}`,
      icon: '/poppik-icon.png',
      badge: '/poppik-badge.png',
      data: { url: '/offers' },
    };

    let sent = 0;
    for (const s of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: s.endpoint,
          keys: { auth: s.auth, p256dh: s.p256dh },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

        await db
          .update(schema.pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where((schema.pushSubscriptions as any).id.eq(s.id));

        sent++;
      } catch (err: any) {
        if (err && (err.statusCode === 410 || err.statusCode === 404)) {
          console.warn(`⚠️ Scheduled: subscription invalid for ${s.email || s.endpoint}, marking inactive`);
          await db
            .update(schema.pushSubscriptions)
            .set({ isActive: false })
            .where((schema.pushSubscriptions as any).id.eq(s.id));
        } else {
          console.error('❌ Scheduled: Failed to send notification for subscription', s.id, err && err.message ? err.message : err);
        }
      }
    }

    console.log(`✅ Scheduled notifications sent to ${sent}/${subscriptions.length} subscribers`);
  } catch (error) {
    console.error('⚠️ Scheduled notifications error:', error);
  }
}

export function startNotificationScheduler() {
  if (!ENABLED) {
    console.log('ℹ️ Push scheduler is disabled. Enable with PUSH_SCHEDULER_ENABLED=true');
    return;
  }

  if (intervalHandle) return; // already running
  console.log(`ℹ️ Starting push scheduler (interval ${INTERVAL_MS} ms)`);
  // run immediately then schedule
  void sendScheduledNotifications();
  intervalHandle = setInterval(() => void sendScheduledNotifications(), INTERVAL_MS);
}

export function stopNotificationScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('ℹ️ Push scheduler stopped');
  }
}

export default { startNotificationScheduler, stopNotificationScheduler };
