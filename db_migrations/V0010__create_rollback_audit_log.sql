-- Создаем таблицу для логирования откатов и действий
CREATE TABLE IF NOT EXISTS t_p8980362_bitrix_webhook_handl.rollback_logs (
    id SERIAL PRIMARY KEY,
    deal_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    change_id INTEGER,
    previous_stage TEXT,
    new_stage TEXT,
    deal_snapshot JSONB,
    performed_at TIMESTAMP DEFAULT NOW(),
    performed_by TEXT,
    reason TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

CREATE INDEX idx_rollback_logs_deal_id ON t_p8980362_bitrix_webhook_handl.rollback_logs(deal_id);
CREATE INDEX idx_rollback_logs_performed_at ON t_p8980362_bitrix_webhook_handl.rollback_logs(performed_at DESC);
