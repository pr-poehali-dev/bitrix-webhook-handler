-- Добавляем колонки для отслеживания изменений и пользователя
ALTER TABLE deal_changes ADD COLUMN IF NOT EXISTS modifier_user_id VARCHAR(50);
ALTER TABLE deal_changes ADD COLUMN IF NOT EXISTS modifier_user_name VARCHAR(255);
ALTER TABLE deal_changes ADD COLUMN IF NOT EXISTS previous_stage VARCHAR(50);
ALTER TABLE deal_changes ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50);
ALTER TABLE deal_changes ADD COLUMN IF NOT EXISTS changes_summary JSONB;

-- Индекс для быстрого поиска по пользователю
CREATE INDEX IF NOT EXISTS idx_deal_changes_modifier ON deal_changes(modifier_user_id);

-- Обновляем существующие записи
UPDATE deal_changes 
SET 
  modifier_user_id = deal_data->>'MODIFY_BY_ID',
  current_stage = deal_data->>'STAGE_ID'
WHERE modifier_user_id IS NULL;
