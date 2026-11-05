-- Team accounts: the existing admin becomes the OWNER, accounts created later are STAFF.
ALTER TABLE admin_user ADD COLUMN role VARCHAR(10) NOT NULL DEFAULT 'OWNER'
    CHECK (role IN ('OWNER', 'STAFF'));
ALTER TABLE admin_user ALTER COLUMN role SET DEFAULT 'STAFF';

-- Deleting a staff account must keep the order history and the stock audit trail ("by" becomes empty).
ALTER TABLE order_status_history DROP CONSTRAINT order_status_history_admin_id_fkey;
ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admin_user (id) ON DELETE SET NULL;
ALTER TABLE stock_movement DROP CONSTRAINT stock_movement_admin_id_fkey;
ALTER TABLE stock_movement ADD CONSTRAINT stock_movement_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES admin_user (id) ON DELETE SET NULL;
