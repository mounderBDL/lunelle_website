-- Sessions issued before this moment are rejected after a password change.
ALTER TABLE admin_user ADD COLUMN password_changed_at TIMESTAMPTZ;