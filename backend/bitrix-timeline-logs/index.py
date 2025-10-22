'''
Business: Получение логов из Битрикс24 Timeline через REST API crm.timeline.logmessage.list
Args: event с httpMethod, queryStringParameters (limit)
Returns: Список логов Timeline с комментариями, заголовками и сообщениями
'''
import json
import os
from typing import Dict, Any, List
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
    limit = int(params.get('limit', '50'))
    
    try:
        logs = get_timeline_logs(limit)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'logs': logs,
                'count': len(logs)
            }, ensure_ascii=False)
        }
    except Exception as e:
        print(f"[ERROR] Ошибка получения логов Timeline: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Ошибка получения логов Timeline'
            }, ensure_ascii=False)
        }

def get_timeline_logs(limit: int) -> List[Dict[str, Any]]:
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_WEBHOOK_URL не настроен')
    
    webhook_url = webhook_url.rstrip('/')
    print(f"[DEBUG] Используем webhook: {webhook_url[:50]}...")
    
    # Используем crm.timeline.comment.list для получения комментариев и активностей
    response = requests.post(
        f'{webhook_url}/crm.timeline.comment.list',
        json={
            'order': {'CREATED': 'DESC'}
        },
        timeout=30
    )
    
    print(f"[DEBUG] Статус ответа: {response.status_code}")
    
    if response.status_code != 200:
        print(f"[DEBUG] Текст ответа: {response.text[:500]}")
        raise Exception(f'Ошибка запроса к API: HTTP {response.status_code}')
    
    data = response.json()
    
    print(f"[DEBUG] Полный ответ API: {data}")
    
    if 'error' in data:
        raise Exception(f"Ошибка API Битрикс24: {data.get('error_description', 'Неизвестная ошибка')}")
    
    if 'result' not in data:
        raise Exception(f"Некорректный ответ API: отсутствует поле 'result'")
    
    logs = data.get('result', [])
    
    print(f"[DEBUG] Получено логов: {len(logs)}")
    
    if logs:
        print(f"[DEBUG] Первый лог: {logs[0]}")
    
    return logs[:limit]