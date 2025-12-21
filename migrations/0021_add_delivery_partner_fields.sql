-- Add deliveryPartner and deliveryType fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_partner varchar(50),
ADD COLUMN IF NOT EXISTS delivery_type varchar(50);

