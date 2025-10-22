import json
import urllib.parse
import base64
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
    raw_body = body_str
    
    if body_str:
        # Битрикс24 может отправлять данные в формате x-www-form-urlencoded или JSON
        content_type = headers.get('Content-Type', headers.get('content-type', ''))
        
        if 'application/x-www-form-urlencoded' in content_type:
            # Декодируем urlencoded данные
            # Если данные в base64, декодируем
            if event.get('isBase64Encoded', False):
                body_str = base64.b64decode(body_str).decode('utf-8')
            
            # Парсим urlencoded строку
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
            # Пытаемся как JSON
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
            'raw_body': raw_body[:500],  # Первые 500 символов сырого тела
            'request_id': context.request_id,
            'function_name': context.function_name
        },
        'bitrix24_event': {
            'event': body_data.get('event', 'не указано'),
            'event_handler_id': body_data.get('event_handler_id', 'не указано'),
            'data': body_data.get('data', {}),
            'ts': body_data.get('ts', 'не указано'),
            'auth': body_data.get('auth', {})
        }
    }
    
    # Логируем в консоль
    print(f"[INFO] Получен запрос: {method}")
    print(f"[INFO] Headers: {json.dumps(headers, ensure_ascii=False)}")
    print(f"[INFO] Событие Битрикс24: {body_data.get('event', 'не указано')}")
    print(f"[INFO] ID сделки: {body_data.get('data', {}).get('FIELDS', {}).get('ID', 'не указано')}")
    print(f"[INFO] Домен: {body_data.get('auth', {}).get('domain', 'не указано')}")
    print(f"[INFO] Полные данные: {json.dumps(body_data, ensure_ascii=False)}")
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(response_data, ensure_ascii=False),
        'isBase64Encoded': False
    }