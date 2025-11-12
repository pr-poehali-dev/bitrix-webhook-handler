-- Расширяем поле action_taken для длинных сообщений
ALTER TABLE t_p8980362_bitrix_webhook_handl.webhook_logs 
ALTER COLUMN action_taken TYPE TEXT;
