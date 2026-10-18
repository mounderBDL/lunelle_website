-- Lunelle - reference data: the 69 wilayas and PLACEHOLDER delivery fees.
--
-- * Wilayas 1-58 are active. Wilayas 59-69 (created 2025/2026) are inactive until
--   the carrier (Yalidine) serves them and their communes are re-assigned;
--   the admin can activate them from the dashboard.
-- * IMPORTANT: the fees below are PLACEHOLDERS (flat 700 home / 450 stop-desk).
--   Replace them with the client's real Yalidine grid from the dashboard before launch.
-- * Never edit this file after it has been applied. Later changes go in V3, V4...
-- * Save this file as UTF-8 (accents).

INSERT INTO wilaya (id, name, is_active) VALUES
    (1,  'Adrar',                  TRUE),
    (2,  'Chlef',                  TRUE),
    (3,  'Laghouat',               TRUE),
    (4,  'Oum El Bouaghi',         TRUE),
    (5,  'Batna',                  TRUE),
    (6,  'Béjaïa',                 TRUE),
    (7,  'Biskra',                 TRUE),
    (8,  'Béchar',                 TRUE),
    (9,  'Blida',                  TRUE),
    (10, 'Bouira',                 TRUE),
    (11, 'Tamanrasset',            TRUE),
    (12, 'Tébessa',                TRUE),
    (13, 'Tlemcen',                TRUE),
    (14, 'Tiaret',                 TRUE),
    (15, 'Tizi Ouzou',             TRUE),
    (16, 'Alger',                  TRUE),
    (17, 'Djelfa',                 TRUE),
    (18, 'Jijel',                  TRUE),
    (19, 'Sétif',                  TRUE),
    (20, 'Saïda',                  TRUE),
    (21, 'Skikda',                 TRUE),
    (22, 'Sidi Bel Abbès',         TRUE),
    (23, 'Annaba',                 TRUE),
    (24, 'Guelma',                 TRUE),
    (25, 'Constantine',            TRUE),
    (26, 'Médéa',                  TRUE),
    (27, 'Mostaganem',             TRUE),
    (28, 'M''Sila',                TRUE),
    (29, 'Mascara',                TRUE),
    (30, 'Ouargla',                TRUE),
    (31, 'Oran',                   TRUE),
    (32, 'El Bayadh',              TRUE),
    (33, 'Illizi',                 TRUE),
    (34, 'Bordj Bou Arréridj',     TRUE),
    (35, 'Boumerdès',              TRUE),
    (36, 'El Tarf',                TRUE),
    (37, 'Tindouf',                TRUE),
    (38, 'Tissemsilt',             TRUE),
    (39, 'El Oued',                TRUE),
    (40, 'Khenchela',              TRUE),
    (41, 'Souk Ahras',             TRUE),
    (42, 'Tipaza',                 TRUE),
    (43, 'Mila',                   TRUE),
    (44, 'Aïn Defla',              TRUE),
    (45, 'Naâma',                  TRUE),
    (46, 'Aïn Témouchent',         TRUE),
    (47, 'Ghardaïa',               TRUE),
    (48, 'Relizane',               TRUE),
    (49, 'Timimoun',               TRUE),
    (50, 'Bordj Badji Mokhtar',    TRUE),
    (51, 'Ouled Djellal',          TRUE),
    (52, 'Béni Abbès',             TRUE),
    (53, 'In Salah',               TRUE),
    (54, 'In Guezzam',             TRUE),
    (55, 'Touggourt',              TRUE),
    (56, 'Djanet',                 TRUE),
    (57, 'El M''Ghair',            TRUE),
    (58, 'El Meniaa',              TRUE),
    -- new wilayas (law of April 2026): inactive until carrier coverage is confirmed
    (59, 'Aflou',                  FALSE),
    (60, 'Barika',                 FALSE),
    (61, 'El Kantara',             FALSE),
    (62, 'Bir El Ater',            FALSE),
    (63, 'El Aricha',              FALSE),
    (64, 'Ksar Chellala',          FALSE),
    (65, 'Aïn Oussera',            FALSE),
    (66, 'Messaad',                FALSE),
    (67, 'Ksar El Boukhari',       FALSE),
    (68, 'Bou Saâda',              FALSE),
    (69, 'El Abiodh Sidi Cheikh',  FALSE);

-- PLACEHOLDER fees: one HOME and one STOP_DESK row per wilaya.
INSERT INTO delivery_rate (wilaya_id, method, fee, is_available)
SELECT id, 'HOME', 700, is_active FROM wilaya
UNION ALL
SELECT id, 'STOP_DESK', 450, is_active FROM wilaya;
