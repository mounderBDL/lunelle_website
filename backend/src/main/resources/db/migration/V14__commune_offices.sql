-- A commune can have several Yalidine offices (stop desks). The Yalidine sync fills this table.
CREATE TABLE commune_office (
    id         INT PRIMARY KEY,                                        -- Yalidine center id
    commune_id INT          NOT NULL REFERENCES commune (id) ON DELETE CASCADE,
    name       VARCHAR(200) NOT NULL,
    address    VARCHAR(300)
);
CREATE INDEX idx_commune_office_commune ON commune_office (commune_id);

-- The office the customer picked, for stop-desk orders.
ALTER TABLE orders ADD COLUMN office_id INT;
