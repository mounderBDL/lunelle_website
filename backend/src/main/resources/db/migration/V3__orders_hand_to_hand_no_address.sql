-- Hand-to-hand orders have no wilaya/commune/address at checkout
-- (the meeting place is set by the admin after the confirmation call).
ALTER TABLE orders ALTER COLUMN wilaya_id   DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN wilaya_name DROP NOT NULL;

-- Delivered orders must still carry a full address.
ALTER TABLE orders ADD CONSTRAINT chk_orders_delivery_address CHECK (
    delivery_method = 'HAND_TO_HAND'
    OR (
        wilaya_id IS NOT NULL
        AND wilaya_name IS NOT NULL
        AND commune_name IS NOT NULL
        AND (delivery_method <> 'HOME' OR address IS NOT NULL)
    )
);