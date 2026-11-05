-- Instagram screenshots of customer reviews, shown on the shop between "Our story" and the FAQ.
CREATE TABLE review_screenshot (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url        VARCHAR(500) NOT NULL,
    public_id  VARCHAR(255),                 -- Cloudinary id, used for deletion
    width      INT NOT NULL DEFAULT 0,
    height     INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);