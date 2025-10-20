-- Добавляем поля для хранения результата обработки вебхука
ALTER TABLE purchase_webhooks 
ADD COLUMN IF NOT EXISTS response_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS response_message TEXT,
ADD COLUMN IF NOT EXISTS purchase_created BOOLEAN DEFAULT false;

-- Индекс для быстрого поиска успешных закупок
CREATE INDEX IF NOT EXISTS idx_webhooks_purchase_created ON purchase_webhooks(purchase_created);
