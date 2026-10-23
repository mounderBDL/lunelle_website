-- 1) "Personalized perfumes" are no longer part of the shop: remove everything related to them.
ALTER TABLE category   DROP COLUMN requires_follow_up;
ALTER TABLE order_item DROP COLUMN requires_follow_up;
ALTER TABLE order_item DROP COLUMN customization_notes;

-- 2) Yalidine pick-up offices: customers choosing "office" delivery can only pick communes
--    that have one. Edited by the admin, or imported from the client's list.
ALTER TABLE commune ADD COLUMN has_office BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_commune_office ON commune (wilaya_id) WHERE has_office;