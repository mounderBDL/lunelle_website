-- Lunelle - initial schema (PostgreSQL, managed by Flyway)
-- Conventions:
--  * Money = integer DZD (no decimals).
--  * Translatable text = paired columns *_en / *_fr (add *_ar later with a new migration).
--  * Enums are VARCHAR + CHECK (simple to map with JPA @Enumerated(STRING)).
--  * Orders snapshot names and prices, so catalog edits never change history.
--  * Phones are stored normalized (10 digits, local format) so search/blocking match exactly.
--  * Revenue = orders with delivered_at set, dated by delivered_at.
--  * Every stock change is logged in stock_movement.
--  * Products and packs are archived (archived_at), never hard-deleted once ordered.

-- ───────────── Admin ─────────────

CREATE TABLE admin_user (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ───────────── Catalog ─────────────

CREATE TABLE category (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               VARCHAR(120) NOT NULL UNIQUE,
    name_en            VARCHAR(150) NOT NULL,
    name_fr            VARCHAR(150) NOT NULL,
    description_en     TEXT,
    description_fr     TEXT,
    image_url          TEXT,
    sort_order         INT     NOT NULL DEFAULT 0,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    -- true for "personalized perfume": orders containing these items are
    -- flagged so the admin remembers to collect details by phone
    requires_follow_up BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE product (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id        UUID         NOT NULL REFERENCES category (id),
    slug               VARCHAR(160) NOT NULL UNIQUE,
    name_en            VARCHAR(200) NOT NULL,
    name_fr            VARCHAR(200) NOT NULL,
    description_en     TEXT,
    description_fr     TEXT,
    scent_notes_en     TEXT,
    scent_notes_fr     TEXT,
    badge              VARCHAR(30),
    -- product-level discount controlled from the dashboard
    discount_active    BOOLEAN      NOT NULL DEFAULT FALSE,
    discount_type      VARCHAR(10)  CHECK (discount_type IN ('PERCENT', 'FIXED')),
    discount_value     INT          CHECK (discount_value IS NULL OR discount_value > 0),
    discount_starts_at TIMESTAMPTZ,
    discount_ends_at   TIMESTAMPTZ,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    is_featured        BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order         INT          NOT NULL DEFAULT 0,
    archived_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_category ON product (category_id, is_active);

CREATE TABLE product_image (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    public_id  TEXT,                       -- Cloudinary id, used for deletion
    sort_order INT  NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_image_product ON product_image (product_id);

-- A product with a single size still has exactly one variant.
CREATE TABLE product_variant (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID        NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    label      VARCHAR(50) NOT NULL,       -- "50 ml", "100 ml", "Standard"
    sku        VARCHAR(60) UNIQUE,
    price      INT         NOT NULL CHECK (price >= 0),   -- base price
    stock      INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order INT         NOT NULL DEFAULT 0,
    UNIQUE (product_id, label)
);

-- ───────────── Packs (fixed contents, fixed price) ─────────────

CREATE TABLE pack (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           VARCHAR(160) NOT NULL UNIQUE,
    name_en        VARCHAR(200) NOT NULL,
    name_fr        VARCHAR(200) NOT NULL,
    description_en TEXT,
    description_fr TEXT,
    image_url      TEXT,
    price          INT          NOT NULL CHECK (price >= 0),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order     INT          NOT NULL DEFAULT 0,
    archived_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE pack_item (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id    UUID NOT NULL REFERENCES pack (id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variant (id),
    quantity   INT  NOT NULL DEFAULT 1 CHECK (quantity > 0),
    UNIQUE (pack_id, variant_id)
);

-- ───────────── Delivery ─────────────

CREATE TABLE wilaya (
    id        INT PRIMARY KEY,             -- official wilaya code
    name      VARCHAR(100) NOT NULL,
    name_ar   VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE commune (
    id          SERIAL PRIMARY KEY,
    wilaya_id   INT          NOT NULL REFERENCES wilaya (id),
    name        VARCHAR(150) NOT NULL,
    external_id INT,                       -- Yalidine commune id (future API)
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_commune_wilaya ON commune (wilaya_id);

-- Hand-to-hand has no rate: fee is always 0, place is set by the admin.
CREATE TABLE delivery_rate (
    id           SERIAL PRIMARY KEY,
    wilaya_id    INT         NOT NULL REFERENCES wilaya (id),
    method       VARCHAR(20) NOT NULL CHECK (method IN ('HOME', 'STOP_DESK')),
    fee          INT         NOT NULL CHECK (fee >= 0),
    is_available BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (wilaya_id, method)
);

-- ───────────── Orders ─────────────

CREATE SEQUENCE order_code_seq START 1;   -- human code: LN-000001

CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(30) NOT NULL UNIQUE,
    public_token    VARCHAR(64) NOT NULL UNIQUE,      -- unguessable, used in confirmation URL
    status          VARCHAR(20) NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'NO_ANSWER', 'RETURNED')),

    customer_name   VARCHAR(150) NOT NULL,
    -- normalized local mobile format by the API: 10 digits, e.g. 0551234567
    phone           VARCHAR(10)  NOT NULL CHECK (phone ~ '^0[5-7][0-9]{8}$'),
    customer_note   TEXT,
    locale          VARCHAR(5)   NOT NULL DEFAULT 'fr',

    wilaya_id       INT          NOT NULL REFERENCES wilaya (id),
    wilaya_name     VARCHAR(100) NOT NULL,            -- snapshot
    commune_id      INT          REFERENCES commune (id),
    commune_name    VARCHAR(150),                     -- snapshot
    address         TEXT,                             -- required for HOME

    delivery_method VARCHAR(20)  NOT NULL CHECK (delivery_method IN ('HOME', 'STOP_DESK', 'HAND_TO_HAND')),
    delivery_fee    INT          NOT NULL CHECK (delivery_fee >= 0),
    handover_place  TEXT,
    handover_at     TIMESTAMPTZ,

    carrier         VARCHAR(30),                      -- future Yalidine integration
    tracking_number VARCHAR(60),

    subtotal        INT NOT NULL CHECK (subtotal >= 0),   -- sum of line totals (product discounts already inside)
    total           INT NOT NULL CHECK (total >= 0),      -- subtotal + delivery_fee
    CONSTRAINT chk_orders_total CHECK (total = subtotal + delivery_fee),

    admin_note      TEXT,
    ip_hash         VARCHAR(64),                      -- anti-abuse, never raw IP

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at    TIMESTAMPTZ,
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ
);
CREATE INDEX idx_orders_status_created ON orders (status, created_at);
CREATE INDEX idx_orders_phone          ON orders (phone);
CREATE INDEX idx_orders_wilaya         ON orders (wilaya_id);
CREATE INDEX idx_orders_created        ON orders (created_at);
-- revenue is dated by delivery day
CREATE INDEX idx_orders_delivered      ON orders (delivered_at) WHERE delivered_at IS NOT NULL;

CREATE TABLE order_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('VARIANT', 'PACK')),
    variant_id          UUID REFERENCES product_variant (id) ON DELETE SET NULL,
    pack_id             UUID REFERENCES pack (id) ON DELETE SET NULL,

    -- snapshots
    name_en             VARCHAR(200) NOT NULL,
    name_fr             VARCHAR(200) NOT NULL,
    variant_label       VARCHAR(50),
    category_name_en    VARCHAR(150),
    category_name_fr    VARCHAR(150),
    original_unit_price INT NOT NULL CHECK (original_unit_price >= 0),  -- before product discount
    unit_price          INT NOT NULL CHECK (unit_price >= 0),           -- price actually charged
    quantity            INT NOT NULL CHECK (quantity > 0),
    line_total          INT NOT NULL CHECK (line_total >= 0),

    -- personalized perfume details, filled by the admin after the call
    requires_follow_up  BOOLEAN NOT NULL DEFAULT FALSE,
    customization_notes TEXT,

    CONSTRAINT chk_order_item_line_total CHECK (line_total = unit_price * quantity)
);
CREATE INDEX idx_order_item_order ON order_item (order_id);

-- What actually left stock for a pack line (used to restore on cancel).
CREATE TABLE order_item_component (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID         NOT NULL REFERENCES order_item (id) ON DELETE CASCADE,
    variant_id    UUID REFERENCES product_variant (id) ON DELETE SET NULL,
    name_en       VARCHAR(200) NOT NULL,
    name_fr       VARCHAR(200) NOT NULL,
    variant_label VARCHAR(50)  NOT NULL,
    quantity      INT          NOT NULL CHECK (quantity > 0)   -- per one pack unit
);
CREATE INDEX idx_order_item_component_item ON order_item_component (order_item_id);

CREATE TABLE order_status_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    from_status VARCHAR(20),
    to_status   VARCHAR(20) NOT NULL,
    note        TEXT,
    admin_id    UUID REFERENCES admin_user (id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_history_order ON order_status_history (order_id);

-- Every change to a variant's stock is recorded here (audit trail).
-- Invariant: product_variant.stock = stock_after of the latest movement.
CREATE TABLE stock_movement (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id  UUID        NOT NULL REFERENCES product_variant (id) ON DELETE CASCADE,
    delta       INT         NOT NULL CHECK (delta <> 0),   -- +10 restock, -1 sold
    stock_after INT         NOT NULL CHECK (stock_after >= 0),
    reason      VARCHAR(20) NOT NULL
        CHECK (reason IN ('INITIAL', 'RESTOCK', 'ADJUSTMENT', 'ORDER_PLACED', 'ORDER_EDITED', 'ORDER_RELEASED')),
    order_id    UUID REFERENCES orders (id) ON DELETE SET NULL,
    admin_id    UUID REFERENCES admin_user (id),           -- null when triggered by a customer order
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movement_variant ON stock_movement (variant_id, created_at);
CREATE INDEX idx_stock_movement_order   ON stock_movement (order_id);

-- ───────────── Content & config (nothing hard-coded) ─────────────

CREATE TABLE banner (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en    VARCHAR(200),
    title_fr    VARCHAR(200),
    subtitle_en VARCHAR(300),
    subtitle_fr VARCHAR(300),
    image_url   TEXT NOT NULL,
    link_url    TEXT,
    sort_order  INT     NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- key/value config: contact phone, social links, free-shipping rules, telegram chat id...
-- (secrets such as the bot token stay in environment variables)
CREATE TABLE setting (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE blocked_phone (
    phone      VARCHAR(10) PRIMARY KEY CHECK (phone ~ '^0[5-7][0-9]{8}$'),
    reason     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
