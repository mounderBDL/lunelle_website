-- Cost price per size (what a bottle costs the business) and its snapshot on order lines.
-- Nullable in the database: existing rows have no cost yet; the API requires it for new/edited sizes.
ALTER TABLE product_variant
    ADD COLUMN cost_price INT CHECK (cost_price IS NULL OR cost_price >= 0);

ALTER TABLE order_item
    ADD COLUMN unit_cost INT CHECK (unit_cost IS NULL OR unit_cost >= 0);