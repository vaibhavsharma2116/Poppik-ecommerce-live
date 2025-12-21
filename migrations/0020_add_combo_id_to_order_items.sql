-- Add combo_id to order_items so combo purchases can be linked
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS combo_id integer REFERENCES combos(id);

-- Optionally, if you want cascade deletes when a combo is removed:
-- ALTER TABLE order_items
-- ALTER COLUMN combo_id SET REFERENCES combos(id) ON DELETE CASCADE;