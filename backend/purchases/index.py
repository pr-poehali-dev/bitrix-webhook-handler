import json
import os
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.parse

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обрабатывает закупки из Битрикс24 - получает товары по сделке и создаёт закупки в ЦРМ Обеспечение
    Args: event - dict с httpMethod, body (company_id или deal_id)
          context - object с атрибутами: request_id, function_name
    Returns: HTTP response dict со списком товаров или результатом создания закупки
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    if not bitrix_webhook:
        return response_json(500, {
            'success': False,
            'error': 'BITRIX24_WEBHOOK_URL не настроен'
        })
    
    if method == 'POST':
        body_data = json.loads(event.get('body', '{}'))
        action = body_data.get('action', '')
        
        # Получение списка товаров по сделке
        if action == 'get_products':
            deal_id = body_data.get('deal_id', '')
            
            if not deal_id:
                return response_json(400, {
                    'success': False,
                    'error': 'deal_id обязателен'
                })
            
            products_result = get_deal_products(bitrix_webhook, deal_id)
            return response_json(200 if products_result['success'] else 400, products_result)
        
        # Создание закупки в ЦРМ Обеспечение
        if action == 'create_purchase':
            deal_id = body_data.get('deal_id', '')
            products = body_data.get('products', [])
            
            if not deal_id:
                return response_json(400, {
                    'success': False,
                    'error': 'deal_id обязателен'
                })
            
            purchase_result = create_purchase_in_crm(bitrix_webhook, deal_id, products)
            return response_json(200 if purchase_result['success'] else 400, purchase_result)
        
        # Вебхук от Битрикс24 (когда создаётся сделка)
        company_id = body_data.get('company_id', '')
        deal_id = body_data.get('deal_id', '')
        
        if deal_id:
            products_result = get_deal_products(bitrix_webhook, deal_id)
            return response_json(200, products_result)
        
        return response_json(400, {
            'success': False,
            'error': 'Укажите action или deal_id'
        })
    
    if method == 'GET':
        query_params = event.get('queryStringParameters', {}) or {}
        deal_id = query_params.get('deal_id', '')
        
        if not deal_id:
            return response_json(400, {
                'success': False,
                'error': 'deal_id обязателен в query параметрах'
            })
        
        products_result = get_deal_products(bitrix_webhook, deal_id)
        return response_json(200 if products_result['success'] else 400, products_result)
    
    return response_json(405, {
        'success': False,
        'error': 'Метод не поддерживается'
    })


def get_deal_products(webhook_url: str, deal_id: str) -> Dict[str, Any]:
    '''
    Получает список товаров (продуктов) по ID сделки из Битрикс24
    '''
    try:
        url = f"{webhook_url.rstrip('/')}/crm.deal.productrows.get.json"
        
        params = urllib.parse.urlencode({'id': deal_id})
        req_url = f"{url}?{params}"
        
        print(f"[DEBUG] Fetching products for deal {deal_id}: {req_url}")
        
        with urllib.request.urlopen(req_url, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if not result.get('result'):
                error_msg = result.get('error_description', 'Товары не найдены')
                print(f"[ERROR] Failed to get products: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'products': []
                }
            
            products = result['result']
            
            formatted_products = []
            for product in products:
                formatted_products.append({
                    'id': product.get('PRODUCT_ID', ''),
                    'name': product.get('PRODUCT_NAME', 'N/A'),
                    'quantity': float(product.get('QUANTITY', 0)),
                    'price': float(product.get('PRICE', 0)),
                    'total': float(product.get('PRICE', 0)) * float(product.get('QUANTITY', 0)),
                    'measure': product.get('MEASURE_NAME', 'шт'),
                })
            
            print(f"[DEBUG] Found {len(formatted_products)} products for deal {deal_id}")
            
            return {
                'success': True,
                'deal_id': deal_id,
                'products': formatted_products,
                'total_items': len(formatted_products)
            }
    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"[ERROR] HTTP error getting products: {e.code} - {error_body}")
        return {
            'success': False,
            'error': f'HTTP ошибка: {e.code}',
            'products': []
        }
    except Exception as e:
        print(f"[ERROR] Exception getting products: {e}")
        return {
            'success': False,
            'error': str(e),
            'products': []
        }


def create_purchase_in_crm(webhook_url: str, deal_id: str, products: List[Dict[str, Any]]) -> Dict[str, Any]:
    '''
    Создаёт закупку в ЦРМ "Обеспечение" на основе сделки и списка товаров
    '''
    try:
        # Сначала получаем данные сделки
        deal_info = get_deal_info(webhook_url, deal_id)
        
        if not deal_info['success']:
            return {
                'success': False,
                'error': f"Не удалось получить данные сделки: {deal_info.get('error')}"
            }
        
        deal_data = deal_info['deal']
        
        # Создаём элемент в смарт-процессе "Обеспечение" (нужен ID смарт-процесса)
        # ВАЖНО: Замените SMART_PROCESS_ID на реальный ID вашего процесса "Обеспечение"
        smart_process_id = os.environ.get('SMART_PROCESS_PURCHASES_ID', '')
        
        if not smart_process_id:
            return {
                'success': False,
                'error': 'SMART_PROCESS_PURCHASES_ID не настроен в секретах'
            }
        
        url = f"{webhook_url.rstrip('/')}/crm.item.add.json"
        
        # Формируем поля для закупки
        fields = {
            'entityTypeId': int(smart_process_id),
            'fields': {
                'title': f"Закупка для сделки {deal_data.get('TITLE', deal_id)}",
                'ufCrm_1_DEAL_ID': deal_id,  # Привязка к сделке (замените на реальное поле)
            }
        }
        
        # Добавляем товары в описание или в отдельное поле
        products_text = '\n'.join([
            f"{p.get('name', 'N/A')}: {p.get('quantity', 0)} {p.get('measure', 'шт')} x {p.get('price', 0)} = {p.get('total', 0)} руб."
            for p in products
        ])
        
        fields['fields']['ufCrm_1_PRODUCTS'] = products_text
        
        data = urllib.parse.urlencode(fields).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        
        print(f"[DEBUG] Creating purchase in CRM for deal {deal_id}")
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if not result.get('result'):
                error_msg = result.get('error_description', 'Не удалось создать закупку')
                print(f"[ERROR] Failed to create purchase: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
            
            purchase_id = result['result'].get('item', {}).get('id', '')
            
            print(f"[DEBUG] Purchase created with ID: {purchase_id}")
            
            return {
                'success': True,
                'purchase_id': purchase_id,
                'deal_id': deal_id,
                'message': 'Закупка успешно создана в ЦРМ Обеспечение'
            }
    
    except Exception as e:
        print(f"[ERROR] Exception creating purchase: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def get_deal_info(webhook_url: str, deal_id: str) -> Dict[str, Any]:
    '''
    Получает информацию о сделке из Битрикс24
    '''
    try:
        url = f"{webhook_url.rstrip('/')}/crm.deal.get.json"
        
        params = urllib.parse.urlencode({'id': deal_id})
        req_url = f"{url}?{params}"
        
        with urllib.request.urlopen(req_url, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if not result.get('result'):
                return {
                    'success': False,
                    'error': result.get('error_description', 'Сделка не найдена')
                }
            
            return {
                'success': True,
                'deal': result['result']
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def response_json(status_code: int, data: Dict[str, Any]) -> Dict[str, Any]:
    '''
    Формирует HTTP response в формате Cloud Function
    '''
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, ensure_ascii=False),
        'isBase64Encoded': False
    }
