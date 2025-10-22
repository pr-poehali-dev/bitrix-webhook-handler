import json
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Тестовый обработчик для проверки вебхуков Битрикс24
    Args: event - dict с httpMethod, body, queryStringParameters
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict с информацией о запросе
    '''
    method: str = event.get('httpMethod', 'POST')
    
    # CORS для всех запросов
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
    
    # Собираем всю информацию о запросе
    headers = event.get('headers', {})
    query_params = event.get('queryStringParameters', {})
    body_str = event.get('body', '')
    
    # Пытаемся распарсить тело запроса
    body_data = {}
    if body_str:
        try:
            body_data = json.loads(body_str)
        except:
            body_data = {'raw': body_str}
    
    # Формируем детальный ответ
    response_data = {
        'success': True,
        'message': 'Обработчик получил запрос',
        'request_info': {
            'method': method,
            'headers': dict(headers),
            'query_params': dict(query_params) if query_params else {},
            'body': body_data,
            'request_id': context.request_id,
            'function_name': context.function_name
        },
        'bitrix24_event': {
            'event': body_data.get('event', 'не указано'),
            'data': body_data.get('data', {}),
            'ts': body_data.get('ts', 'не указано'),
            'auth': body_data.get('auth', {})
        }
    }
    
    # Логируем в консоль
    print(f"[INFO] Получен запрос: {method}")
    print(f"[INFO] Headers: {json.dumps(headers, ensure_ascii=False)}")
    print(f"[INFO] Body: {json.dumps(body_data, ensure_ascii=False)}")
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(response_data, ensure_ascii=False),
        'isBase64Encoded': False
    }
