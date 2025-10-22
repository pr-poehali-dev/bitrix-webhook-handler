-- Создание таблицы для логов изменений сделок
CREATE TABLE IF NOT EXISTS deal_changes (
    id SERIAL PRIMARY KEY,
    deal_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    deal_data JSONB NOT NULL,
    event_handler_id VARCHAR(50),
    bitrix_domain VARCHAR(255),
    member_id VARCHAR(255),
    timestamp_received TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp_bitrix BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по ID сделки
CREATE INDEX IF NOT EXISTS idx_deal_changes_deal_id ON deal_changes(deal_id);

-- Индекс для поиска по времени
CREATE INDEX IF NOT EXISTS idx_deal_changes_created_at ON deal_changes(created_at DESC);

-- Индекс для поиска по типу события
CREATE INDEX IF NOT EXISTS idx_deal_changes_event_type ON deal_changes(event_type);

COMMENT ON TABLE deal_changes IS 'Логи всех изменений сделок из Битрикс24';
COMMENT ON COLUMN deal_changes.deal_id IS 'ID сделки в Битрикс24';
COMMENT ON COLUMN deal_changes.event_type IS 'Тип события (ONCRMDEALUPDATE, ONCRMDEALCREATE и т.д.)';
COMMENT ON COLUMN deal_changes.deal_data IS 'Полные данные сделки из REST API в JSON';
COMMENT ON COLUMN deal_changes.timestamp_bitrix IS 'Unix timestamp из события Битрикс24';
