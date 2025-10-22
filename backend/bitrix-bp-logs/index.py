'''
Business: Получение логов бизнес-процессов Битрикс24 через REST API или прямое подключение к БД
Args: event с httpMethod, queryStringParameters (source, limit, offset, status, search)
Returns: Список логов БП со статусами, ошибками, пользователями
'''
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    params = event.get('queryStringParameters') or {}
    source = params.get('source', 'api')
    limit = int(params.get('limit', '50'))
    offset = int(params.get('offset', '0'))
    status_filter = params.get('status')
    search_query = params.get('search')
    
    try:
        if source == 'db':
            logs = get_logs_from_db(limit, offset, status_filter, search_query)
        else:
            logs = get_logs_from_api(limit, offset, status_filter, search_query)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'logs': logs,
                'count': len(logs),
                'limit': limit,
                'offset': offset
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Ошибка получения логов'
            })
        }

def get_logs_from_api(limit: int, offset: int, status_filter: Optional[str], search: Optional[str]) -> List[Dict[str, Any]]:
    webhook_url = os.environ.get('BITRIX24_BP_WEBHOOK_URL') or os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_BP_WEBHOOK_URL не настроен')
    
    webhook_url = webhook_url.rstrip('/')
    
    # Получаем список шаблонов БП
    templates_response = requests.get(
        f'{webhook_url}/bizproc.workflow.template.list',
        timeout=30
    )
    templates_response.raise_for_status()
    templates_data = templates_response.json()
    
    if 'result' not in templates_data:
        raise ValueError(f'Ошибка API получения шаблонов: {templates_data.get("error_description", "Неизвестная ошибка")}')
    
    templates = {t['ID']: t for t in templates_data.get('result', [])}
    logs = []
    
    # Получаем список активных экземпляров БП через bizproc.workflow.instance.list
    instances_response = requests.get(
        f'{webhook_url}/bizproc.workflow.instance.list',
        params={'order': {'MODIFIED': 'DESC'}, 'filter': {}},
        timeout=30
    )
    
    if instances_response.status_code != 200:
        # Если метод не работает, возвращаем информацию о шаблонах
        for template_id, template in list(templates.items())[:limit]:
            if search and search.lower() not in template.get('NAME', '').lower():
                continue
            
            logs.append({
                'id': template_id,
                'name': template.get('NAME', 'Без названия'),
                'status': 'unknown',
                'started': template.get('MODIFIED', ''),
                'user_id': template.get('USER_ID', ''),
                'document_id': '',
                'errors': [],
                'last_activity': template.get('MODIFIED', '')
            })
        return logs
    
    instances_data = instances_response.json()
    instances = instances_data.get('result', [])
    
    for instance in instances:
        try:
            template_name = templates.get(instance.get('TEMPLATE_ID'), {}).get('NAME', 'Без названия')
            
            # Пытаемся получить детальные логи
            errors = []
            try:
                log_response = requests.get(
                    f'{webhook_url}/bizproc.workflow.instance.get',
                    params={'ID': instance['ID']},
                    timeout=5
                )
                if log_response.status_code == 200:
                    detail_data = log_response.json()
                    if 'error' in detail_data:
                        errors.append(detail_data.get('error_description', 'Неизвестная ошибка'))
            except:
                pass
            
            # Определяем статус
            workflow_status = instance.get('STATUS', 0)
            if errors or workflow_status == 3:
                status = 'error'
            elif workflow_status in [0, 1]:
                status = 'running'
            elif workflow_status == 2:
                status = 'completed'
            elif workflow_status == 4:
                status = 'terminated'
            else:
                status = 'unknown'
            
            log_entry = {
                'id': instance['ID'],
                'name': instance.get('WORKFLOW_TEMPLATE_NAME') or template_name,
                'status': status,
                'started': instance.get('STARTED', ''),
                'user_id': str(instance.get('STARTED_BY', '')),
                'document_id': instance.get('DOCUMENT_ID', ''),
                'errors': errors,
                'last_activity': instance.get('MODIFIED', instance.get('STARTED', ''))
            }
            
            if status_filter and status != status_filter:
                continue
            
            if search:
                search_lower = search.lower()
                if (search_lower not in log_entry['name'].lower() and 
                    search_lower not in str(log_entry['id']).lower()):
                    continue
            
            logs.append(log_entry)
            
            if len(logs) >= limit:
                break
                
        except Exception as e:
            print(f"Ошибка обработки экземпляра {instance.get('ID')}: {e}")
            continue
    
    return logs[offset:offset + limit]

def get_logs_from_db(limit: int, offset: int, status_filter: Optional[str], search: Optional[str]) -> List[Dict[str, Any]]:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    
    db_config = {
        'host': os.environ.get('BITRIX24_DB_HOST'),
        'database': os.environ.get('BITRIX24_DB_NAME'),
        'user': os.environ.get('BITRIX24_DB_USER'),
        'password': os.environ.get('BITRIX24_DB_PASSWORD'),
        'port': os.environ.get('BITRIX24_DB_PORT', '3306')
    }
    
    for key, value in db_config.items():
        if not value:
            raise ValueError(f'{key} не настроен в секретах')
    
    conn = psycopg2.connect(**db_config)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    query = '''
        SELECT 
            wi.ID as id,
            wt.NAME as name,
            wi.STARTED as started,
            wi.STARTED_BY as user_id,
            wi.DOCUMENT_ID as document_id,
            wi.WORKFLOW_STATE as workflow_state,
            GROUP_CONCAT(
                CASE WHEN t.EXECUTION_STATUS = 4 THEN t.NOTE ELSE NULL END 
                SEPARATOR '|'
            ) as errors,
            MAX(t.MODIFIED) as last_activity
        FROM b_bp_workflow_instance wi
        LEFT JOIN b_bp_workflow_template wt ON wi.WORKFLOW_TEMPLATE_ID = wt.ID
        LEFT JOIN b_bp_tracking t ON wi.ID = t.WORKFLOW_ID
    '''
    
    conditions = []
    params = []
    
    if search:
        conditions.append("(wt.NAME LIKE %s OR wi.ID LIKE %s)")
        search_pattern = f'%{search}%'
        params.extend([search_pattern, search_pattern])
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " GROUP BY wi.ID ORDER BY wi.STARTED DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    logs = []
    for row in rows:
        errors = row['errors'].split('|') if row['errors'] else []
        errors = [e for e in errors if e]
        
        wf_state = str(row['workflow_state'] or '0')
        if errors:
            status = 'error'
        elif wf_state in ['0', '1', '2']:
            status = 'running'
        elif wf_state == '3':
            status = 'completed'
        elif wf_state == '4':
            status = 'terminated'
        else:
            status = 'unknown'
        
        if status_filter and status != status_filter:
            continue
        
        logs.append({
            'id': str(row['id']),
            'name': row['name'] or 'Без названия',
            'status': status,
            'started': row['started'].isoformat() if row['started'] else '',
            'user_id': str(row['user_id'] or ''),
            'document_id': row['document_id'] or '',
            'errors': errors,
            'last_activity': row['last_activity'].isoformat() if row['last_activity'] else row['started'].isoformat() if row['started'] else ''
        })
    
    cursor.close()
    conn.close()
    
    return logs