-- Create product_shades junction table
CREATE TABLE IF NOT EXISTS product_shades (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    shade_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT product_shades_product_id_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT product_shades_shade_id_fk FOREIGN KEY (shade_id) REFERENCES shades(id) ON DELETE CASCADE,
    CONSTRAINT product_shades_unique UNIQUE (product_id, shade_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_shades_product_id ON product_shades (product_id);
CREATE INDEX IF NOT EXISTS idx_product_shades_shade_id ON product_shades (shade_id);
