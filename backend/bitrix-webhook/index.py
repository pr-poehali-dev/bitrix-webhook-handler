import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
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
            
            cur.execute("SELECT bitrix_id, title, created_at FROM companies WHERE inn = %s AND bitrix_id != %s ORDER BY created_at ASC", (inn, bitrix_id))
            existing_companies = cur.fetchall()
            
            if len(existing_companies) > 0:
                old_company = existing_companies[0]
                action_taken = f"Duplicate INN found. Existing company: {old_company['bitrix_id']}"
                deleted = False
                
                delete_result = delete_bitrix_company(bitrix_id)
                if delete_result.get('success'):
                    action_taken = f"Auto-deleted NEW duplicate company {bitrix_id} (INN already exists in {old_company['bitrix_id']})"
                    deleted = True
                else:
                    action_taken = f"Failed to delete new company {bitrix_id}: {delete_result.get('error')}"
                
                log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'duplicate_found', True, action_taken)
                conn.commit()
                
                return response_json(200, {
                    'duplicate': True,
                    'inn': inn,
                    'new_company_id': bitrix_id,
                    'existing_company': {
                        'bitrix_id': old_company['bitrix_id'],
                        'title': old_company['title'],
                        'created_at': old_company['created_at'].isoformat()
                    },
                    'action': 'deleted' if deleted else 'delete_failed',
                    'deleted': deleted,
                    'message': action_taken
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

def delete_bitrix_company(company_id: str) -> Dict[str, Any]:
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
                return {'success': True, 'data': result}
            else:
                error_msg = result.get('error_description', 'Unknown error')
                return {'success': False, 'error': error_msg}
    
    except Exception as e:
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