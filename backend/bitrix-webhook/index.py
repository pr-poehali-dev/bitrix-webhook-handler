import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import urllib.parse

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обрабатывает вебхуки из Битрикс24, проверяет дубликаты ИНН и удаляет последние записи
    Args: event - dict с httpMethod, body, queryStringParameters
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict с результатом проверки
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        headers = event.get('headers', {})
        user_agent = headers.get('User-Agent', headers.get('user-agent', 'Unknown'))
        
        # Получаем реальный IP клиента (учитываем прокси)
        x_forwarded_for = headers.get('X-Forwarded-For', headers.get('x-forwarded-for', ''))
        x_real_ip = headers.get('X-Real-IP', headers.get('x-real-ip', ''))
        source_ip_from_context = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'Unknown')
        
        # Приоритет: X-Forwarded-For (первый IP в списке) > X-Real-IP > sourceIp
        if x_forwarded_for:
            source_ip = x_forwarded_for.split(',')[0].strip()
        elif x_real_ip:
            source_ip = x_real_ip
        else:
            source_ip = source_ip_from_context
        
        source_info = f"IP: {source_ip} | UA: {user_agent[:100]}"
        
        if method == 'DELETE':
            cur.execute("DELETE FROM webhook_logs")
            deleted_count = cur.rowcount
            conn.commit()
            return response_json(200, {
                'success': True,
                'message': f'Deleted {deleted_count} log entries',
                'deleted_count': deleted_count
            })
        
        if method == 'POST':
            body_str = event.get('body', '{}')
            if not body_str or body_str.strip() == '':
                body_str = '{}'
            body_data = json.loads(body_str)
            bitrix_id: str = body_data.get('bitrix_id', '').strip()
            
            # Проверяем, если это запрос на восстановление компании
            restore_action = body_data.get('action', '')
            print(f"[DEBUG] POST body_data: {body_data}")
            print(f"[DEBUG] restore_action: {restore_action}")
            
            if restore_action == 'restore':
                original_data = body_data.get('original_data', {})
                print(f"[DEBUG] Restoring company with data: {original_data}")
                restore_result = restore_deleted_company(original_data)
                print(f"[DEBUG] Restore result: {restore_result}")
                
                if restore_result.get('success'):
                    log_webhook(cur, 'restore_company', original_data.get('inn', ''), restore_result.get('company_id', ''), body_data, 'success', False, f"Company restored: {restore_result.get('company_id')}", source_info, method)
                    conn.commit()
                    return response_json(200, {
                        'success': True,
                        'message': 'Company restored successfully',
                        'company_id': restore_result.get('company_id')
                    })
                else:
                    log_webhook(cur, 'restore_company', original_data.get('inn', ''), '', body_data, 'error', False, f"Failed to restore: {restore_result.get('error')}", source_info, method)
                    conn.commit()
                    return response_json(400, {
                        'success': False,
                        'error': restore_result.get('error')
                    })
            
        elif method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            bitrix_id: str = query_params.get('bitrix_id', query_params.get('id', '')).strip()
            body_data = {'bitrix_id': bitrix_id, 'method': 'GET'}
        else:
            return response_json(405, {'error': 'Method not allowed'})
        
        if not bitrix_id:
            cur.execute("SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 100")
            logs = cur.fetchall()
            
            cur.execute("""
                SELECT 
                    COALESCE(COUNT(*), 0) as total_requests,
                    COALESCE(SUM(CASE WHEN duplicate_found = true THEN 1 ELSE 0 END), 0) as duplicates_found,
                    COALESCE(SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END), 0) as successful
                FROM webhook_logs
            """)
            stats_row = cur.fetchone()
            stats = dict(stats_row) if stats_row else {'total_requests': 0, 'duplicates_found': 0, 'successful': 0}
            
            return response_json(200, {
                'logs': [serialize_log(log) for log in logs] if logs else [],
                'stats': stats
            })
            
        # Проверка на тестовые/невалидные ID (999999 и подобные)
        if bitrix_id in ['999999', '0', ''] or not bitrix_id.isdigit():
            error_msg = f"Invalid or test company ID: {bitrix_id}"
            print(f"[DEBUG] Skipping invalid company ID: {bitrix_id}")
            # Не логируем тестовые запросы как ошибки
            return response_json(400, {
                'error': error_msg,
                'skip_log': True,
                'message': 'Test or invalid company ID'
            })
        
        company_data = get_bitrix_company(bitrix_id)
        
        if not company_data.get('success'):
            error_msg = f"Failed to get company data: {company_data.get('error')}"
            
            # Если компания не найдена (404/Not found) - это нормально, не логируем как ошибку
            if 'Not found' in error_msg or 'HTTP 400' in error_msg:
                print(f"[DEBUG] Company {bitrix_id} not found in Bitrix24 (deleted or test)")
                return response_json(404, {
                    'error': 'Company not found',
                    'message': 'Company may have been deleted or does not exist'
                })
            
            # Только реальные ошибки API логируем
            log_webhook(cur, 'check_inn', '', bitrix_id, body_data, 'error', False, error_msg, source_info, method)
            conn.commit()
            return response_json(400, {'error': error_msg})
        
        company_info = company_data.get('company', {})
        inn: str = company_info.get('RQ_INN', '').strip()
        title: str = company_info.get('TITLE', '')
        
        if not inn:
            action_msg = 'Company has no INN'
            
            # Создаём задачу и отправляем уведомление автору
            task_result = create_task_for_missing_inn(bitrix_id, title, company_info)
            if task_result.get('success'):
                action_msg += f" | Task created: {task_result.get('task_id')}"
            else:
                action_msg += f" | Failed to create task: {task_result.get('error')}"
            
            log_webhook(cur, 'check_inn', '', bitrix_id, body_data, 'no_inn', False, action_msg, source_info, method)
            conn.commit()
            return response_json(200, {
                'duplicate': False, 
                'message': 'Company has no INN, task created for responsible user',
                'task_created': task_result.get('success', False),
                'task_id': task_result.get('task_id')
            })
        
        search_result = find_duplicate_companies_by_inn(inn)
        
        if search_result.get('success') and len(search_result.get('companies', [])) > 0:
            bitrix_companies = search_result['companies']
            
            print(f"[DEBUG] Found {len(bitrix_companies)} companies with INN {inn}")
            print(f"[DEBUG] Company IDs: {[c['ID'] for c in bitrix_companies]}")
            print(f"[DEBUG] Current company ID: {bitrix_id}")
            
            # КРИТИЧНО: Отфильтровываем текущую компанию из списка найденных
            # Сравниваем как строки, т.к. ID из Битрикс может быть строкой
            existing_ids = [c['ID'] for c in bitrix_companies if str(c['ID']) != str(bitrix_id)]
            
            print(f"[DEBUG] Other company IDs (excluding current): {existing_ids}")
            print(f"[DEBUG] Total companies found: {len(bitrix_companies)}, Others: {len(existing_ids)}")
            print(f"[DEBUG] Comparison: bitrix_id={bitrix_id} (type: {type(bitrix_id)})")
            print(f"[DEBUG] All found IDs: {[(c['ID'], type(c['ID'])) for c in bitrix_companies]}")
            
            # Дубликат ТОЛЬКО если найдены ДРУГИЕ компании (не текущая)
            if len(existing_ids) == 0:
                # Найдена только текущая компания - НЕ дубликат
                action_msg = f"Only current company {bitrix_id} found with INN {inn}, not a duplicate (total: {len(bitrix_companies)})"
                print(f"[DEBUG] {action_msg}")
                log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'success', False, action_msg, source_info, method)
                
                cur.execute(
                    "INSERT INTO companies (bitrix_id, inn, title) VALUES (%s, %s, %s) ON CONFLICT (bitrix_id) DO UPDATE SET inn = EXCLUDED.inn, title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP",
                    (bitrix_id, inn, title)
                )
                conn.commit()
                
                return response_json(200, {
                    'duplicate': False,
                    'inn': inn,
                    'bitrix_id': bitrix_id,
                    'message': 'ИНН уникален, компания сохранена'
                })
            
            # Найдены другие компании с таким же ИНН - это дубликат
            old_company_id = existing_ids[0]
            action_taken = f"Duplicate INN found in Bitrix24. Existing company: {old_company_id}"
            deleted = False
            
            print(f"[DEBUG] Duplicate detected! Current: {bitrix_id}, Existing: {old_company_id}")
            
            # КРИТИЧНО: Сохраняем ПОЛНЫЙ объект компании со ВСЕМИ полями
            # company_info уже содержит ВСЕ поля + дела (добавлены в get_bitrix_company)
            company_backup = dict(company_info)
            company_backup['ID'] = bitrix_id  # Сохраняем оригинальный ID
            company_backup['bitrix_id'] = bitrix_id  # Дублируем для совместимости
            
            print(f"[DEBUG] Company backup created with {len(company_backup)} fields")
            print(f"[DEBUG] Deals in backup: {len(company_backup.get('DEALS', []))} deals")
            
            delete_result = delete_bitrix_company(bitrix_id)
            if delete_result.get('success'):
                action_taken = f"Auto-deleted NEW duplicate company {bitrix_id} (INN already exists in {old_company_id})"
                deleted = True
            else:
                action_taken = f"Failed to delete new company {bitrix_id}: {delete_result.get('error')}"
            
            # Сохраняем данные для восстановления в request_body
            body_data_with_backup = body_data.copy()
            body_data_with_backup['deleted_company_data'] = company_backup
            
            log_webhook(cur, 'check_inn', inn, bitrix_id, body_data_with_backup, 'duplicate_found', True, action_taken, source_info, method)
            conn.commit()
            
            return response_json(200, {
                'duplicate': True,
                'inn': inn,
                'new_company_id': bitrix_id,
                'existing_company_id': old_company_id,
                'bitrix_companies': bitrix_companies,
                'action': 'deleted' if deleted else 'delete_failed',
                'deleted': deleted,
                'message': action_taken,
                'company_backup': company_backup
            })
        
        cur.execute(
            "INSERT INTO companies (bitrix_id, inn, title) VALUES (%s, %s, %s) ON CONFLICT (bitrix_id) DO UPDATE SET inn = EXCLUDED.inn, title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP",
            (bitrix_id, inn, title)
        )
        
        log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'success', False, 'No duplicate, company saved', source_info, method)
        conn.commit()
        
        return response_json(200, {
            'duplicate': False,
            'inn': inn,
            'bitrix_id': bitrix_id,
            'message': 'ИНН уникален, компания сохранена'
        })
    
    finally:
        cur.close()
        conn.close()
    
    return response_json(405, {'error': 'Method not allowed'})

def log_webhook(cur, webhook_type: str, inn: str, bitrix_id: str, request_body: Dict, status: str, duplicate: bool, action: str, source_info: str = '', method: str = 'POST'):
    cur.execute(
        "INSERT INTO webhook_logs (webhook_type, inn, bitrix_company_id, request_body, response_status, duplicate_found, action_taken, source_info, request_method) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (webhook_type, inn, bitrix_id, json.dumps(request_body), status, duplicate, action, source_info, method)
    )

def serialize_log(log: Dict) -> Dict:
    result = dict(log)
    if 'created_at' in result and result['created_at']:
        # Конвертируем UTC в Екатеринбург (UTC+5)
        ekb_tz = timezone(timedelta(hours=5))
        if result['created_at'].tzinfo is None:
            # Если время без timezone, считаем его UTC
            utc_time = result['created_at'].replace(tzinfo=timezone.utc)
        else:
            utc_time = result['created_at']
        
        ekb_time = utc_time.astimezone(ekb_tz)
        result['created_at'] = ekb_time.strftime('%Y-%m-%d %H:%M:%S')
    return result

def get_bitrix_company(company_id: str) -> Dict[str, Any]:
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'}
    
    try:
        # Получаем ВСЕ поля компании
        params = urllib.parse.urlencode({'ID': company_id})
        url = f"{bitrix_webhook.rstrip('/')}/crm.company.get.json?{params}"
        print(f"[DEBUG] Requesting Bitrix24 company with ALL fields: {url}")
        
        with urllib.request.urlopen(url, timeout=10) as response:
            response_text = response.read().decode('utf-8')
            print(f"[DEBUG] Bitrix24 company response: {response_text[:500]}")
            result = json.loads(response_text)
            
            if result.get('result'):
                company = result['result']
                inn = company.get('RQ_INN', '').strip()
                
                if not inn:
                    print(f"[DEBUG] No INN in company fields, checking requisites...")
                    inn = get_company_inn_from_requisites(company_id)
                    print(f"[DEBUG] INN from requisites: {inn}")
                    company['RQ_INN'] = inn
                
                # Получаем дела по компании
                deals = get_company_deals(company_id)
                company['DEALS'] = deals
                print(f"[DEBUG] Found {len(deals)} deals for company {company_id}")
                
                return {'success': True, 'company': company}
            else:
                error_msg = result.get('error_description', result.get('error', 'Company not found'))
                print(f"[DEBUG] Bitrix24 error: {error_msg}")
                return {'success': False, 'error': error_msg}
    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else 'No error body'
        print(f"[DEBUG] HTTPError {e.code}: {error_body}")
        return {'success': False, 'error': f'HTTP {e.code}: {error_body}'}
    except Exception as e:
        print(f"[DEBUG] Exception: {type(e).__name__}: {str(e)}")
        return {'success': False, 'error': str(e)}

def get_company_inn_from_requisites(company_id: str) -> str:
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return ''
    
    try:
        params_dict = {
            'filter[ENTITY_ID]': company_id,
            'filter[ENTITY_TYPE_ID]': '4'
        }
        params = urllib.parse.urlencode(params_dict)
        url = f"{bitrix_webhook.rstrip('/')}/crm.requisite.list.json?{params}"
        print(f"[DEBUG] Requesting requisites: {url}")
        
        with urllib.request.urlopen(url, timeout=10) as response:
            response_text = response.read().decode('utf-8')
            print(f"[DEBUG] Requisites response: {response_text[:1000]}")
            result = json.loads(response_text)
            
            if result.get('result'):
                requisites = result['result']
                print(f"[DEBUG] Found {len(requisites)} requisites")
                for req in requisites:
                    inn = req.get('RQ_INN', '').strip()
                    print(f"[DEBUG] Requisite ID={req.get('ID')}, RQ_INN={inn}")
                    if inn:
                        return inn
        
        return ''
    
    except Exception as e:
        print(f"[DEBUG] Error getting requisites: {type(e).__name__}: {str(e)}")
        return ''

def find_duplicate_companies_by_inn(inn: str) -> Dict[str, Any]:
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured', 'companies': []}
    
    try:
        url = f"{bitrix_webhook.rstrip('/')}/crm.company.list.json"
        params = {
            'filter': {'RQ_INN': inn},
            'select': ['ID', 'TITLE', 'DATE_CREATE']
        }
        
        data = urllib.parse.urlencode({'filter[RQ_INN]': inn, 'select[]': ['ID', 'TITLE', 'DATE_CREATE']}).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result'):
                return {'success': True, 'companies': result['result']}
            else:
                return {'success': False, 'error': result.get('error_description', 'Unknown error'), 'companies': []}
    
    except Exception as e:
        return {'success': False, 'error': str(e), 'companies': []}

def create_task_for_missing_inn(company_id: str, company_title: str, company_info: Dict[str, Any]) -> Dict[str, Any]:
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'}
    
    try:
        # Получаем ID автора компании (кто создал)
        assigned_by_id = company_info.get('ASSIGNED_BY_ID', company_info.get('CREATED_BY_ID', '1'))
        
        # Формируем описание задачи
        task_title = f"Заполнить реквизиты компании: {company_title}"
        task_description = f"Требуется заполнить ИНН для компании [{company_title}](https://your-bitrix24.ru/crm/company/details/{company_id}/)\n\n"
        task_description += "Без заполненного ИНН не работает автоматическая проверка дубликатов компаний."
        
        # Срок выполнения = текущее время сервера
        from datetime import datetime
        deadline = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%S+00:00')
        
        # Создаём задачу
        url = f"{bitrix_webhook.rstrip('/')}/tasks.task.add.json"
        
        task_data = {
            'fields[TITLE]': task_title,
            'fields[DESCRIPTION]': task_description,
            'fields[RESPONSIBLE_ID]': assigned_by_id,
            'fields[DEADLINE]': deadline,
            'fields[UF_CRM_TASK]': [f'CO_{company_id}'],  # Привязка к компании
        }
        
        data = urllib.parse.urlencode(task_data).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result') and result['result'].get('task'):
                task_id = result['result']['task']['id']
                print(f"[DEBUG] Task created: {task_id}")
                
                # Отправляем уведомление автору
                notify_result = send_notification_to_user(assigned_by_id, task_title, company_id, company_title)
                
                return {
                    'success': True, 
                    'task_id': task_id,
                    'notification_sent': notify_result.get('success', False)
                }
            else:
                error_msg = result.get('error_description', result.get('error', 'Unknown error'))
                print(f"[DEBUG] Task creation error: {error_msg}")
                return {'success': False, 'error': error_msg}
    
    except Exception as e:
        print(f"[DEBUG] Exception creating task: {type(e).__name__}: {str(e)}")
        return {'success': False, 'error': str(e)}

def send_notification_to_user(user_id: str, message: str, company_id: str, company_title: str) -> Dict[str, Any]:
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'}
    
    try:
        url = f"{bitrix_webhook.rstrip('/')}/im.notify.json"
        
        notification_message = f"⚠️ Необходимо заполнить реквизиты компании [{company_title}]\n"
        notification_message += f"Компания создана без ИНН. Для корректной работы системы проверки дубликатов требуется заполнить реквизиты."
        
        params = {
            'to': user_id,
            'message': notification_message,
            'type': 'SYSTEM'
        }
        
        data = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result'):
                print(f"[DEBUG] Notification sent to user {user_id}")
                return {'success': True}
            else:
                error_msg = result.get('error_description', result.get('error', 'Unknown error'))
                print(f"[DEBUG] Notification error: {error_msg}")
                return {'success': False, 'error': error_msg}
    
    except Exception as e:
        print(f"[DEBUG] Exception sending notification: {type(e).__name__}: {str(e)}")
        return {'success': False, 'error': str(e)}

def restore_deleted_company(company_data: Dict[str, Any]) -> Dict[str, Any]:
    '''Восстанавливает компанию с ПОЛНЫМ копированием ВСЕХ полей и дел'''
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'}
    
    try:
        url = f"{bitrix_webhook.rstrip('/')}/crm.company.add.json"
        
        original_id = company_data.get('ID', company_data.get('bitrix_id'))
        print(f"[DEBUG] Restoring company {original_id} with full data copy")
        print(f"[DEBUG] Company data keys: {list(company_data.keys())[:20]}...")
        
        # Список полей-исключений (системные, не для копирования)
        skip_fields = {'ID', 'bitrix_id', 'inn', 'DEALS', 'DATE_CREATE', 'DATE_MODIFY', 
                      'CREATED_BY_ID', 'MODIFY_BY_ID', 'COMPANY_ID'}
        
        fields = {}
        
        # Автоматически копируем ВСЕ простые поля из backup
        for key, value in company_data.items():
            if key in skip_fields or value is None or value == '':
                continue
            
            # Мультиполя обрабатываем отдельно
            if key in ['PHONE', 'EMAIL', 'WEB', 'IM']:
                continue
            
            # Если это список или словарь - пропускаем (кроме уже обработанных)
            if isinstance(value, (list, dict)):
                continue
            
            # Простое поле - копируем напрямую
            fields[f'fields[{key}]'] = str(value)
        
        # Обязательные поля
        fields['fields[TITLE]'] = company_data.get('TITLE', 'Восстановленная компания')
        fields['fields[RQ_INN]'] = company_data.get('RQ_INN', company_data.get('inn', ''))
        
        # Восстанавливаем мультиполя с полной структурой
        multifields = {
            'PHONE': company_data.get('PHONE', []),
            'EMAIL': company_data.get('EMAIL', []),
            'WEB': company_data.get('WEB', []),
            'IM': company_data.get('IM', [])
        }
        
        for field_name, field_values in multifields.items():
            if not field_values:
                continue
            
            # Приводим к списку если это не список
            if not isinstance(field_values, list):
                field_values = [{'VALUE': field_values}]
            
            for idx, item in enumerate(field_values):
                if isinstance(item, dict) and item.get('VALUE'):
                    fields[f'fields[{field_name}][{idx}][VALUE]'] = item['VALUE']
                    if item.get('VALUE_TYPE'):
                        fields[f'fields[{field_name}][{idx}][VALUE_TYPE]'] = item['VALUE_TYPE']
        
        print(f"[DEBUG] Prepared {len(fields)} fields for restore")
        
        data = urllib.parse.urlencode(fields).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result'):
                new_company_id = result['result']
                print(f"[DEBUG] Company restored with new ID: {new_company_id} (original was {original_id})")
                
                # Восстанавливаем дела, переназначая их на новую компанию
                deals = company_data.get('DEALS', [])
                if deals:
                    print(f"[DEBUG] Restoring {len(deals)} deals to new company {new_company_id}")
                    restore_deals_result = restore_company_deals(deals, new_company_id)
                    print(f"[DEBUG] Deals restore result: {restore_deals_result}")
                
                return {'success': True, 'company_id': str(new_company_id), 'original_id': original_id}
            else:
                error_msg = result.get('error_description', result.get('error', 'Unknown error'))
                print(f"[DEBUG] Restore error: {error_msg}")
                return {'success': False, 'error': error_msg}
    
    except Exception as e:
        print(f"[DEBUG] Exception restoring company: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[DEBUG] Traceback: {traceback.format_exc()}")
        return {'success': False, 'error': str(e)}

def restore_company_deals(deals: List[Dict[str, Any]], new_company_id: str) -> Dict[str, Any]:
    '''Копирует дела на восстановленную компанию'''
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook or not deals:
        return {'success': False, 'restored_count': 0}
    
    restored_count = 0
    errors = []
    
    for deal in deals:
        try:
            url = f"{bitrix_webhook.rstrip('/')}/crm.deal.update.json"
            params = {
                'ID': deal['ID'],
                'fields[COMPANY_ID]': new_company_id
            }
            
            data = urllib.parse.urlencode(params).encode('utf-8')
            req = urllib.request.Request(url, data=data)
            
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                
                if result.get('result'):
                    restored_count += 1
                else:
                    errors.append(f"Deal {deal['ID']}: {result.get('error_description', 'Unknown error')}")
        
        except Exception as e:
            errors.append(f"Deal {deal['ID']}: {str(e)}")
    
    print(f"[DEBUG] Restored {restored_count}/{len(deals)} deals")
    if errors:
        print(f"[DEBUG] Errors: {errors}")
    
    return {'success': True, 'restored_count': restored_count, 'total': len(deals), 'errors': errors}

def get_company_deals(company_id: str) -> List[Dict[str, Any]]:
    '''Получает все дела по компании'''
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        print(f"[DEBUG] BITRIX24_WEBHOOK_URL not configured")
        return []
    
    try:
        filter_params = urllib.parse.urlencode({'filter[COMPANY_ID]': company_id})
        url = f"{bitrix_webhook.rstrip('/')}/crm.deal.list.json?{filter_params}"
        print(f"[DEBUG] Getting deals for company {company_id}: {url}")
        
        with urllib.request.urlopen(url, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result'):
                deals = result['result']
                print(f"[DEBUG] Found {len(deals)} deals")
                return deals
            else:
                print(f"[DEBUG] No deals found or error: {result}")
                return []
    
    except Exception as e:
        print(f"[DEBUG] Exception getting deals: {type(e).__name__}: {str(e)}")
        return []

def delete_bitrix_company(company_id: str) -> Dict[str, Any]:
    '''Удаляет компанию из Битрикс24'''
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'}
    
    try:
        url = f"{bitrix_webhook.rstrip('/')}/crm.company.delete.json"
        params = {'ID': company_id}
        
        data = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result'):
                print(f"[DEBUG] Company {company_id} deleted successfully")
                return {'success': True, 'data': result}
            else:
                error_msg = result.get('error_description', 'Unknown error')
                print(f"[DEBUG] Delete error: {error_msg}")
                return {'success': False, 'error': error_msg}
    
    except Exception as e:
        print(f"[DEBUG] Exception deleting company: {type(e).__name__}: {str(e)}")
        return {'success': False, 'error': str(e)}

def response_json(status_code: int, data: Dict) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps(data, ensure_ascii=False)
    }