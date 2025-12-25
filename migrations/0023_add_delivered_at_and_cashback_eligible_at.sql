-- Migration: add deliveredAt to orders and eligibleAt to user_wallet_transactions for delayed cashback

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamp;
