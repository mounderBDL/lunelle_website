ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(64);

-- two orders can never share a key; orders without a key (admin tools, old orders) are not affected
CREATE UNIQUE INDEX uq_orders_idempotency_key ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;