DO $$
DECLARE
  legacy_order_col text := 'ship' || 'rocket_order_id';
  legacy_ship_col  text := 'ship' || 'rocket_shipment_id';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = legacy_order_col
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', 'orders', legacy_order_col, 'ithink_order_id');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = legacy_ship_col
  ) THEN
    EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', 'orders', legacy_ship_col, 'ithink_shipment_id');
  END IF;
END $$;
