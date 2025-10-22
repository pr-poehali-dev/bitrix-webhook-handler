import json
import os
import urllib.parse
import urllib.request
import base64
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Отслеживает изменения сделок в Битрикс24 и сохраняет полные данные в БД
    Args: event - dict с httpMethod, body от Битрикс24
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict с результатом обработки
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    body_str = event.get('body', '')
    
    # Логируем RAW данные для дебага
    print(f"[DEBUG] Method: {method}")
    print(f"[DEBUG] Headers: {json.dumps(headers, ensure_ascii=False)[:300]}")
    print(f"[DEBUG] Body (raw): {body_str[:500]}")
    print(f"[DEBUG] Query params: {event.get('queryStringParameters', {})}")
    
    # Парсим данные от Битрикс24
    body_data = {}
    if body_str:
        content_type = headers.get('Content-Type', headers.get('content-type', ''))
        
        if 'application/x-www-form-urlencoded' in content_type:
            # Декодируем base64 если нужно
            if event.get('isBase64Encoded', False):
                try:
                    body_str = base64.b64decode(body_str).decode('utf-8')
                    print(f"[DEBUG] Decoded from base64: {body_str[:200]}")
                except Exception as e:
                    print(f"[ERROR] Failed to decode base64: {e}")
            
            parsed = urllib.parse.parse_qs(body_str)
            body_data = {k: v[0] if len(v) == 1 else v for k, v in parsed.items()}
            
            # Парсим вложенные структуры auth и data
            if 'auth[domain]' in body_data:
                auth = {}
                data_fields = {}
                for key, value in list(body_data.items()):
                    if key.startswith('auth['):
                        auth_key = key.replace('auth[', '').replace(']', '')
                        auth[auth_key] = value
                        del body_data[key]
                    elif key.startswith('data[FIELDS]['):
                        field_key = key.replace('data[FIELDS][', '').replace(']', '')
                        data_fields[field_key] = value
                        del body_data[key]
                
                if auth:
                    body_data['auth'] = auth
                if data_fields:
                    body_data['data'] = {'FIELDS': data_fields}
        else:
            try:
                body_data = json.loads(body_str)
            except:
                body_data = {}
    
    # Извлекаем данные события
    event_type = body_data.get('event', '')
    event_handler_id = body_data.get('event_handler_id', '')
    ts = body_data.get('ts', '')
    auth = body_data.get('auth', {})
    data_fields = body_data.get('data', {}).get('FIELDS', {})
    
    deal_id = data_fields.get('ID', '')
    domain = auth.get('domain', '')
    member_id = auth.get('member_id', '')
    application_token = auth.get('application_token', '')
    client_endpoint = auth.get('client_endpoint', '')
    
    print(f"[INFO] Событие: {event_type}, Сделка ID: {deal_id}, Домен: {domain}")
    
    if not deal_id:
        print(f"[WARN] Недостаточно данных для обработки события")
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': True, 'message': 'Недостаточно данных'}),
            'isBase64Encoded': False
        }
    
    # Используем входящий вебхук из секретов для REST API
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    if not webhook_url:
        print(f"[ERROR] Секрет BITRIX24_WEBHOOK_URL не настроен!")
        deal_full_data = {'error': 'BITRIX24_WEBHOOK_URL не настроен', 'deal_id': deal_id}
    else:
        # Получаем полные данные сделки через REST API
        rest_url = f"{webhook_url}crm.deal.get.json"
        params = urllib.parse.urlencode({'ID': deal_id})
        
        try:
            print(f"[INFO] Запрос к REST API: {rest_url}?{params[:100]}...")
            
            req = urllib.request.Request(f"{rest_url}?{params}")
            with urllib.request.urlopen(req, timeout=10) as response:
                rest_data = json.loads(response.read().decode('utf-8'))
            
            if not rest_data.get('result'):
                print(f"[WARN] REST API не вернул данные сделки: {rest_data}")
                deal_full_data = {'error': 'Нет данных от REST API', 'raw': rest_data}
            else:
                deal_full_data = rest_data['result']
                print(f"[INFO] Получены данные сделки: {json.dumps(deal_full_data, ensure_ascii=False)[:200]}...")
            
        except Exception as e:
            print(f"[ERROR] Ошибка при запросе к REST API: {e}")
            deal_full_data = {'error': str(e), 'deal_id': deal_id}
    
    # Получаем данные пользователя через REST API
    modifier_id = deal_full_data.get('MODIFY_BY_ID', '')
    modifier_name = ''
    
    if modifier_id and webhook_url:
        try:
            user_url = f"{webhook_url}user.get.json"
            user_params = urllib.parse.urlencode({'ID': modifier_id})
            user_req = urllib.request.Request(f"{user_url}?{user_params}")
            
            with urllib.request.urlopen(user_req, timeout=5) as user_response:
                user_data = json.loads(user_response.read().decode('utf-8'))
                
            if user_data.get('result') and len(user_data['result']) > 0:
                user = user_data['result'][0]
                modifier_name = f"{user.get('NAME', '')} {user.get('LAST_NAME', '')}".strip()
                print(f"[INFO] Пользователь: {modifier_name}")
        except Exception as e:
            print(f"[WARN] Не удалось получить имя пользователя: {e}")
    
    # Находим предыдущее состояние для отслеживания изменений
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    previous_stage = None
    try:
        cur.execute("""
            SELECT deal_data->>'STAGE_ID' as stage_id 
            FROM deal_changes 
            WHERE deal_id = %s 
            ORDER BY timestamp_received DESC 
            LIMIT 1
        """, (deal_id,))
        
        prev_row = cur.fetchone()
        if prev_row:
            previous_stage = prev_row['stage_id']
    except Exception as e:
        print(f"[WARN] Не удалось получить предыдущее состояние: {e}")
    
    current_stage = deal_full_data.get('STAGE_ID', '')
    
    # Формируем summary изменений
    changes_summary = {}
    if previous_stage and previous_stage != current_stage:
        changes_summary['stage'] = {'from': previous_stage, 'to': current_stage}
    
    try:
        cur.execute("""
            INSERT INTO deal_changes (
                deal_id, event_type, deal_data, event_handler_id,
                bitrix_domain, member_id, timestamp_bitrix,
                modifier_user_id, modifier_user_name, 
                previous_stage, current_stage, changes_summary
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            deal_id,
            event_type,
            json.dumps(deal_full_data, ensure_ascii=False),
            event_handler_id,
            domain,
            member_id,
            int(ts) if ts else None,
            modifier_id,
            modifier_name,
            previous_stage,
            current_stage,
            json.dumps(changes_summary, ensure_ascii=False) if changes_summary else None
        ))
        
        result = cur.fetchone()
        log_id = result['id']
        conn.commit()
        
        print(f"[SUCCESS] Сохранено в БД с ID: {log_id}")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Данные сделки сохранены',
                'log_id': log_id,
                'deal_id': deal_id,
                'event_type': event_type
            }, ensure_ascii=False),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Ошибка сохранения в БД: {e}")
        
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': str(e)}),
            'isBase64Encoded': False
        }
    finally:
        cur.close()
        conn.close()