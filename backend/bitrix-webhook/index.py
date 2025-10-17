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
        headers = event.get('headers', {})
        user_agent = headers.get('User-Agent', headers.get('user-agent', 'Unknown'))
        source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'Unknown')
        source_info = f"IP: {source_ip} | UA: {user_agent[:100]}"
        
        if method == 'POST':
            body_str = event.get('body', '{}')
            if not body_str or body_str.strip() == '':
                body_str = '{}'
            body_data = json.loads(body_str)
            bitrix_id: str = body_data.get('bitrix_id', '').strip()
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
            
        company_data = get_bitrix_company(bitrix_id)
        
        if not company_data.get('success'):
            error_msg = f"Failed to get company data: {company_data.get('error')}"
            log_webhook(cur, 'check_inn', '', bitrix_id, body_data, 'error', False, error_msg, source_info)
            conn.commit()
            return response_json(400, {'error': error_msg})
        
        company_info = company_data.get('company', {})
        inn: str = company_info.get('RQ_INN', '').strip()
        title: str = company_info.get('TITLE', '')
        
        if not inn:
            log_webhook(cur, 'check_inn', '', bitrix_id, body_data, 'error', False, 'Company has no INN', source_info)
            conn.commit()
            return response_json(200, {'duplicate': False, 'message': 'Company has no INN, skipping check'})
        
        search_result = find_duplicate_companies_by_inn(inn)
        
        if search_result.get('success') and len(search_result.get('companies', [])) > 0:
            bitrix_companies = search_result['companies']
            
            existing_ids = [c['ID'] for c in bitrix_companies if c['ID'] != bitrix_id]
            
            if len(existing_ids) > 0:
                old_company_id = existing_ids[0]
                action_taken = f"Duplicate INN found in Bitrix24. Existing company: {old_company_id}"
                deleted = False
                
                delete_result = delete_bitrix_company(bitrix_id)
                if delete_result.get('success'):
                    action_taken = f"Auto-deleted NEW duplicate company {bitrix_id} (INN already exists in {old_company_id})"
                    deleted = True
                else:
                    action_taken = f"Failed to delete new company {bitrix_id}: {delete_result.get('error')}"
                
                log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'duplicate_found', True, action_taken, source_info)
                conn.commit()
                
                return response_json(200, {
                    'duplicate': True,
                    'inn': inn,
                    'new_company_id': bitrix_id,
                    'existing_company_id': old_company_id,
                    'bitrix_companies': bitrix_companies,
                    'action': 'deleted' if deleted else 'delete_failed',
                    'deleted': deleted,
                    'message': action_taken
                })
        
        cur.execute(
            "INSERT INTO companies (bitrix_id, inn, title) VALUES (%s, %s, %s) ON CONFLICT (bitrix_id) DO UPDATE SET inn = EXCLUDED.inn, title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP",
            (bitrix_id, inn, title)
        )
        
        log_webhook(cur, 'check_inn', inn, bitrix_id, body_data, 'success', False, 'No duplicate, company saved', source_info)
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

def log_webhook(cur, webhook_type: str, inn: str, bitrix_id: str, request_body: Dict, status: str, duplicate: bool, action: str, source_info: str = ''):
    cur.execute(
        "INSERT INTO webhook_logs (webhook_type, inn, bitrix_company_id, request_body, response_status, duplicate_found, action_taken, source_info) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (webhook_type, inn, bitrix_id, json.dumps(request_body), status, duplicate, action, source_info)
    )

def serialize_log(log: Dict) -> Dict:
    result = dict(log)
    if 'created_at' in result and result['created_at']:
        result['created_at'] = result['created_at'].isoformat()
    return result

def get_bitrix_company(company_id: str) -> Dict[str, Any]:
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return {'success': False, 'error': 'BITRIX24_WEBHOOK_URL not configured'}
    
    try:
        params = urllib.parse.urlencode({'ID': company_id})
        url = f"{bitrix_webhook.rstrip('/')}/crm.company.get.json?{params}"
        print(f"[DEBUG] Requesting Bitrix24: {url}")
        
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