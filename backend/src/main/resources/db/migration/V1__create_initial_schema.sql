
-- Lunelle V1: Initial database schema
-- PostgreSQL + Flyway

-- =========================================================
-- 1. ENUM TYPES
-- =========================================================

CREATE TYPE user_role AS ENUM ('ADMIN');

CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE discount_type AS ENUM ('PERCENTAGE', 'FIXED');

CREATE TYPE delivery_method AS ENUM ('HAND_TO_HAND', 'DELIVERY');

CREATE TYPE delivery_type AS ENUM ('TO_OFFICE', 'TO_HOME');

CREATE TYPE order_status AS ENUM (
    'CONFIRMED',
    'DELIVERED',
    'RETURNED',
    'CANCELLED'
);

CREATE TYPE idempotency_status AS ENUM (
    'IN_PROGRESS',
    'COMPLETED'
);

-- =========================================================
-- 2. USERS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'ADMIN',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ
);

-- =========================================================
-- 3. CATEGORIES
-- =========================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    slug VARCHAR(180) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. PRODUCTS
-- =========================================================

CREATE TABLE products (
    id UUID PRIMARY KEY,
    category_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (discount >= 0),
    discount_type discount_type NOT NULL DEFAULT 'PERCENTAGE',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_product_percentage_discount
        CHECK (
            discount_type <> 'PERCENTAGE'
            OR discount <= 100
        )
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_active ON products(is_active);

-- =========================================================
-- 5. PRODUCT IMAGES
-- =========================================================

CREATE TABLE product_images (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0
        CHECK (display_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_product_images_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_product_images_product_id
    ON product_images(product_id);

CREATE UNIQUE INDEX uq_product_images_one_primary
    ON product_images(product_id)
    WHERE is_primary = TRUE;

-- =========================================================
-- 6. PACKS
-- =========================================================

CREATE TABLE packs (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_packs_active ON packs(is_active);

-- =========================================================
-- 7. PACK ITEMS
-- =========================================================

CREATE TABLE pack_items (
    id UUID PRIMARY KEY,
    pack_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    CONSTRAINT uq_pack_items_pack_product
        UNIQUE (pack_id, product_id),

    CONSTRAINT fk_pack_items_pack
        FOREIGN KEY (pack_id)
        REFERENCES packs(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_pack_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_pack_items_product_id ON pack_items(product_id);

-- =========================================================
-- 8. DELIVERY ZONES
-- =========================================================

CREATE TABLE delivery_zones (
    id UUID PRIMARY KEY,
    wilaya VARCHAR(100) NOT NULL UNIQUE,
    home_delivery_fee NUMERIC(12, 2) NOT NULL
        CHECK (home_delivery_fee >= 0),
    office_delivery_fee NUMERIC(12, 2) NOT NULL
        CHECK (office_delivery_fee >= 0)
);

-- =========================================================
-- 9. DELIVERY OFFICES
-- =========================================================

CREATE TABLE delivery_offices (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    wilaya VARCHAR(100) NOT NULL,
    commune VARCHAR(150) NOT NULL,

    CONSTRAINT uq_delivery_office_location
        UNIQUE (name, wilaya, commune)
);

CREATE INDEX idx_delivery_offices_wilaya_commune
    ON delivery_offices(wilaya, commune);

-- =========================================================
-- 10. ORDERS
-- =========================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    order_number VARCHAR(30) NOT NULL UNIQUE,
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    wilaya VARCHAR(100) NOT NULL,
    commune VARCHAR(150) NOT NULL,
    delivery_method delivery_method NOT NULL,
    delivery_type delivery_type,
    delivery_office VARCHAR(200),

    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (discount >= 0),
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (delivery_fee >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),

    status order_status NOT NULL DEFAULT 'CONFIRMED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_total
        CHECK (total = subtotal - discount + delivery_fee),

    CONSTRAINT chk_order_discount_not_above_subtotal
        CHECK (discount <= subtotal),

    CONSTRAINT chk_order_delivery_details
        CHECK (
            (
                delivery_method = 'HAND_TO_HAND'
                AND delivery_type IS NULL
                AND delivery_office IS NULL
                AND delivery_fee = 0
            )
            OR
            (
                delivery_method = 'DELIVERY'
                AND delivery_type = 'TO_HOME'
                AND delivery_office IS NULL
            )
            OR
            (
                delivery_method = 'DELIVERY'
                AND delivery_type = 'TO_OFFICE'
                AND delivery_office IS NOT NULL
            )
        )
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_wilaya ON orders(wilaya);

-- =========================================================
-- 11. ORDER ITEMS
-- =========================================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id UUID,
    pack_id UUID,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (discount >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_order_item_product_or_pack
        CHECK (
            (product_id IS NOT NULL AND pack_id IS NULL)
            OR
            (product_id IS NULL AND pack_id IS NOT NULL)
        ),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_order_items_pack
        FOREIGN KEY (pack_id)
        REFERENCES packs(id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_pack_id ON order_items(pack_id);

-- =========================================================
-- 12. IDEMPOTENCY KEYS
-- Prevents duplicate guest orders when checkout is retried.
-- =========================================================

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    request_hash VARCHAR(128) NOT NULL,
    response_status INTEGER,
    response_body JSONB,
    status idempotency_status NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT chk_idempotency_expiry
        CHECK (expires_at > created_at),

    CONSTRAINT chk_idempotency_response
        CHECK (
            (status = 'IN_PROGRESS'
                AND response_status IS NULL
                AND response_body IS NULL)
            OR
            (status = 'COMPLETED'
                AND response_status IS NOT NULL
                AND response_body IS NOT NULL)
        )
);

CREATE INDEX idx_idempotency_keys_expires_at
    ON idempotency_keys(expires_at);