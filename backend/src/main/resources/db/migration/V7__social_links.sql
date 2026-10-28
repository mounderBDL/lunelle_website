-- Social media links, managed from the dashboard (replaces the single Instagram setting).
CREATE TABLE social_link (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network    VARCHAR(20) NOT NULL
        CHECK (network IN ('INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WHATSAPP', 'YOUTUBE', 'SNAPCHAT', 'X',
                           'PINTEREST', 'TELEGRAM', 'THREADS', 'LINKEDIN', 'WEBSITE', 'OTHER')),
    label      VARCHAR(60),
    url        VARCHAR(300) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

-- keep the Instagram link that was already saved
INSERT INTO social_link (network, label, url, sort_order)
SELECT 'INSTAGRAM', NULL, value, 0 FROM setting WHERE key = 'instagram_url' AND value <> '';

DELETE FROM setting WHERE key = 'instagram_url';