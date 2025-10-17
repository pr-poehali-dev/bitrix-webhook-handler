import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            inn: str = body_data.get('inn', '').strip()
            bitrix_id: str = body_data.get('bitrix_id', '').strip()
            title: str = body_data.get('title', '')
            
            if not inn or not bitrix_id:
                log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'error', False, 'Missing inn or bitrix_id')
                conn.commit()
                return response_json(400, {'error': 'inn and bitrix_id are required'})
            
            cur.execute("SELECT bitrix_id, title, created_at FROM companies WHERE inn = %s ORDER BY created_at DESC", (inn,))
            duplicates = cur.fetchall()
            
            if len(duplicates) > 0:
                latest_duplicate = duplicates[0]
                
                delete_url = body_data.get('delete_webhook_url')
                action_taken = f"Duplicate found: {latest_duplicate['bitrix_id']}"
                
                if delete_url and latest_duplicate['bitrix_id'] != bitrix_id:
                    action_taken = f"Should delete {latest_duplicate['bitrix_id']} via {delete_url}"
                
                log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'duplicate_found', True, action_taken)
                conn.commit()
                
                return response_json(200, {
                    'duplicate': True,
                    'inn': inn,
                    'existing_company': {
                        'bitrix_id': latest_duplicate['bitrix_id'],
                        'title': latest_duplicate['title'],
                        'created_at': latest_duplicate['created_at'].isoformat()
                    },
                    'action': 'delete_latest',
                    'message': f'Найден дубликат ИНН {inn}. Рекомендуется удалить компанию {latest_duplicate["bitrix_id"]}'
                })
            
            cur.execute(
                "INSERT INTO companies (bitrix_id, inn, title) VALUES (%s, %s, %s) ON CONFLICT (bitrix_id) DO UPDATE SET inn = EXCLUDED.inn, title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP",
                (bitrix_id, inn, title)
            )
            
            log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'success', False, 'No duplicate, company saved')
            conn.commit()
            
            return response_json(200, {
                'duplicate': False,
                'inn': inn,
                'bitrix_id': bitrix_id,
                'message': 'ИНН уникален, компания сохранена'
            })
        
        if method == 'GET':
            cur.execute("SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 100")
            logs = cur.fetchall()
            
            cur.execute("""
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN duplicate_found = true THEN 1 ELSE 0 END) as duplicates_found,
                    SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END) as successful
                FROM webhook_logs
            """)
            stats = cur.fetchone()
            
            return response_json(200, {
                'logs': [serialize_log(log) for log in logs],
                'stats': stats
            })
    
    finally:
        cur.close()
        conn.close()
    
    return response_json(405, {'error': 'Method not allowed'})

def log_webhook(cur, webhook_type: str, inn: str, bitrix_id: str, request_body: Dict, status: str, duplicate: bool, action: str):
    cur.execute(
        "INSERT INTO webhook_logs (webhook_type, inn, bitrix_company_id, request_body, response_status, duplicate_found, action_taken) VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (webhook_type, inn, bitrix_id, json.dumps(request_body), status, duplicate, action)
    )

def serialize_log(log: Dict) -> Dict:
    result = dict(log)
    if 'created_at' in result and result['created_at']:
        result['created_at'] = result['created_at'].isoformat()
    return result

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
