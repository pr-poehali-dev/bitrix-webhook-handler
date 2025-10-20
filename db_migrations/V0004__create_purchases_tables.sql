-- Создание таблицы для логов вебхуков закупок
CREATE TABLE IF NOT EXISTS purchase_webhooks (
    id SERIAL PRIMARY KEY,
    deal_id VARCHAR(50) NOT NULL,
    company_id VARCHAR(50),
    webhook_type VARCHAR(50) DEFAULT 'deal_product_request',
    products_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    request_body TEXT,
    response_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_info TEXT
);

-- Создание таблицы для закупок и их статусов
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    purchase_id VARCHAR(50) UNIQUE NOT NULL,
    deal_id VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new',
    products_count INTEGER DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    products_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bitrix_link TEXT
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchase_webhooks_deal_id ON purchase_webhooks(deal_id);
CREATE INDEX IF NOT EXISTS idx_purchases_deal_id ON purchases(deal_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at DESC);

-- Комментарии к таблицам
COMMENT ON TABLE purchase_webhooks IS 'Журнал входящих вебхуков по закупкам';
COMMENT ON TABLE purchases IS 'Реестр созданных закупок и их статусы';
