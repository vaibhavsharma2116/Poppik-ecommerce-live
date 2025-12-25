ALTER TABLE "user_wallet_transactions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;

UPDATE "user_wallet_transactions"
SET "expires_at" = "created_at" + interval '1 minute'
WHERE "type" = 'reserve'
  AND "status" = 'pending'
  AND "expires_at" IS NULL;

ALTER TABLE "user_wallet_transactions"
  ADD CONSTRAINT IF NOT EXISTS "user_wallet_transactions_reserve_expires_at_not_null"
  CHECK ("type" <> 'reserve' OR "expires_at" IS NOT NULL);



ALTER TABLE user_wallet_transactions
  ADD COLUMN IF NOT EXISTS eligible_at timestamp;
