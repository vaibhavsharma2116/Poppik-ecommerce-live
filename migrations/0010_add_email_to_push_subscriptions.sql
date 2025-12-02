-- Add email column to push_subscriptions table
ALTER TABLE push_subscriptions ADD COLUMN email VARCHAR(255);

-- Create index on email for faster queries
CREATE INDEX idx_push_subscriptions_email ON push_subscriptions(email);
