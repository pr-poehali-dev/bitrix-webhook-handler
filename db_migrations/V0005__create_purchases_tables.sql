-- Таблица для хранения созданных закупок
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    purchase_id VARCHAR(100) NOT NULL,
    deal_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    products_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для логирования входящих вебхуков
CREATE TABLE IF NOT EXISTS purchase_webhooks (
    id SERIAL PRIMARY KEY,
    deal_id VARCHAR(100) NOT NULL,
    company_id VARCHAR(100),
    webhook_type VARCHAR(100) DEFAULT 'OnCrmDealUpdate',
    products_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    source_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchases_deal_id ON purchases(deal_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_deal_id ON purchase_webhooks(deal_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON purchase_webhooks(created_at DESC);
