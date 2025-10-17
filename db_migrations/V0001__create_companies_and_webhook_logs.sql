-- Таблица для хранения компаний из Битрикс24
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    bitrix_id VARCHAR(255) UNIQUE NOT NULL,
    inn VARCHAR(12) NOT NULL,
    title VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для логирования вебхуков
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    webhook_type VARCHAR(100) NOT NULL,
    inn VARCHAR(12),
    bitrix_company_id VARCHAR(255),
    request_body TEXT,
    response_status VARCHAR(50),
    duplicate_found BOOLEAN DEFAULT FALSE,
    action_taken VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_companies_inn ON companies(inn);
CREATE INDEX IF NOT EXISTS idx_companies_bitrix_id ON companies(bitrix_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_inn ON webhook_logs(inn);