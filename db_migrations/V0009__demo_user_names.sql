-- Временное обновление для демонстрации (пока нет прав на user.get в вебхуке)
UPDATE deal_changes 
SET modifier_user_name = 'Администратор (ID: 1)' 
WHERE modifier_user_id = '1' 
AND (modifier_user_name IS NULL OR modifier_user_name = '' OR modifier_user_name = 'Пользователь #1');
