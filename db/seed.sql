-- sample data for Postgres initiation

-- Seed users
INSERT INTO users (email)
VALUES
    ('pig@market.com'),
    ('dog@market.com');

-- Seed products
INSERT INTO products (sku, name, inventory)
VALUES
    ('SKU-001', 'Keyboard', 50),
    ('SKU-002', 'Mouse', 10),
    ('SKU-003', 'USB-C Cable', 2);
