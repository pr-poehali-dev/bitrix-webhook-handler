import json
import os
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.parse
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обрабатывает закупки из Битрикс24 - получает товары по сделке, создаёт закупки в ЦРМ Обеспечение, логирует вебхуки
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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
        
        if not bitrix_webhook:
            return response_json(500, {
                'success': False,
                'error': 'BITRIX24_WEBHOOK_URL не настроен'
            })
        
        headers = event.get('headers', {})
        user_agent = headers.get('User-Agent', headers.get('user-agent', 'Unknown'))
        x_forwarded_for = headers.get('X-Forwarded-For', headers.get('x-forwarded-for', ''))
        source_ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'Unknown')
        source_info = f"IP: {source_ip} | UA: {user_agent[:100]}"
        
        # GET - Получение списка закупок и вебхуков
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            action = query_params.get('action', '')
            
            # Получить список закупок
            if action == 'list_purchases':
                cur.execute('''
                    SELECT * FROM purchases 
                    ORDER BY created_at DESC 
                    LIMIT 100
                ''')
                purchases = [dict(row) for row in cur.fetchall()]
                
                for p in purchases:
                    if isinstance(p.get('created_at'), datetime):
                        p['created_at'] = p['created_at'].isoformat()
                    if isinstance(p.get('updated_at'), datetime):
                        p['updated_at'] = p['updated_at'].isoformat()
                
                return response_json(200, {
                    'success': True,
                    'purchases': purchases,
                    'total': len(purchases)
                })
            
            # Получить журнал вебхуков
            if action == 'list_webhooks':
                cur.execute('''
                    SELECT * FROM purchase_webhooks 
                    ORDER BY created_at DESC 
                    LIMIT 100
                ''')
                webhooks = [dict(row) for row in cur.fetchall()]
                
                for w in webhooks:
                    if isinstance(w.get('created_at'), datetime):
                        w['created_at'] = w['created_at'].isoformat()
                
                return response_json(200, {
                    'success': True,
                    'webhooks': webhooks,
                    'total': len(webhooks)
                })
            
            # Получить товары по сделке
            deal_id = query_params.get('deal_id', '')
            
            if not deal_id:
                return response_json(400, {
                    'success': False,
                    'error': 'deal_id обязателен в query параметрах'
                })
            
            products_result = get_deal_products(bitrix_webhook, deal_id)
            
            if products_result['success']:
                log_webhook(cur, conn, deal_id, '', 'get_products', 
                           len(products_result.get('products', [])), 0, 
                           json.dumps({'deal_id': deal_id}), 'success', source_info)
            
            return response_json(200 if products_result['success'] else 400, products_result)
        
        # POST - Создание закупки или получение товаров
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
                
                if products_result['success']:
                    log_webhook(cur, conn, deal_id, '', 'get_products', 
                               len(products_result.get('products', [])), 0,
                               json.dumps(body_data), 'success', source_info)
                
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
                
                if purchase_result['success']:
                    total_amount = sum([p.get('total', 0) for p in products])
                    
                    log_webhook(cur, conn, deal_id, '', 'create_purchase',
                               len(products), total_amount,
                               json.dumps(body_data), 'success', source_info)
                    
                    save_purchase(cur, conn, purchase_result.get('purchase_id', ''),
                                 deal_id, purchase_result.get('title', ''),
                                 'new', len(products), total_amount,
                                 json.dumps(products, ensure_ascii=False))
                
                return response_json(200 if purchase_result['success'] else 400, purchase_result)
            
            # Вебхук от Битрикс24 (когда создаётся сделка)
            deal_id = body_data.get('deal_id', body_data.get('data', {}).get('FIELDS', {}).get('ID', ''))
            company_id = body_data.get('company_id', '')
            
            if deal_id:
                products_result = get_deal_products(bitrix_webhook, deal_id)
                
                if products_result['success']:
                    total_amount = sum([p.get('total', 0) for p in products_result.get('products', [])])
                    
                    log_webhook(cur, conn, deal_id, company_id, 'webhook_deal_add',
                               len(products_result.get('products', [])), total_amount,
                               json.dumps(body_data), 'success', source_info)
                
                return response_json(200, products_result)
            
            return response_json(400, {
                'success': False,
                'error': 'Укажите action или deal_id'
            })
        
        # DELETE - Очистка логов
        if method == 'DELETE':
            query_params = event.get('queryStringParameters', {}) or {}
            action = query_params.get('action', '')
            
            if action == 'clear_webhooks':
                cur.execute('DELETE FROM purchase_webhooks')
                deleted = cur.rowcount
                conn.commit()
                return response_json(200, {
                    'success': True,
                    'message': f'Удалено записей: {deleted}'
                })
        
        return response_json(405, {
            'success': False,
            'error': 'Метод не поддерживается'
        })
    
    finally:
        cur.close()
        conn.close()


def log_webhook(cur, conn, deal_id: str, company_id: str, webhook_type: str,
                products_count: int, total_amount: float, request_body: str,
                response_status: str, source_info: str):
    '''
    Сохраняет лог вебхука в БД
    '''
    cur.execute('''
        INSERT INTO purchase_webhooks 
        (deal_id, company_id, webhook_type, products_count, total_amount, request_body, response_status, source_info)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ''', (deal_id, company_id, webhook_type, products_count, total_amount, request_body, response_status, source_info))
    conn.commit()


def save_purchase(cur, conn, purchase_id: str, deal_id: str, title: str,
                  status: str, products_count: int, total_amount: float, products_data: str):
    '''
    Сохраняет закупку в БД
    '''
    cur.execute('''
        INSERT INTO purchases 
        (purchase_id, deal_id, title, status, products_count, total_amount, products_data)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (purchase_id) DO UPDATE SET
            status = EXCLUDED.status,
            products_count = EXCLUDED.products_count,
            total_amount = EXCLUDED.total_amount,
            updated_at = CURRENT_TIMESTAMP
    ''', (purchase_id, deal_id, title, status, products_count, total_amount, products_data))
    conn.commit()


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
        deal_info = get_deal_info(webhook_url, deal_id)
        
        if not deal_info['success']:
            return {
                'success': False,
                'error': f"Не удалось получить данные сделки: {deal_info.get('error')}"
            }
        
        deal_data = deal_info['deal']
        
        smart_process_id = os.environ.get('SMART_PROCESS_PURCHASES_ID', '')
        
        if not smart_process_id:
            return {
                'success': False,
                'error': 'SMART_PROCESS_PURCHASES_ID не настроен в секретах'
            }
        
        url = f"{webhook_url.rstrip('/')}/crm.item.add.json"
        
        title = f"Закупка для сделки {deal_data.get('TITLE', deal_id)}"
        
        fields = {
            'entityTypeId': int(smart_process_id),
            'fields': {
                'title': title,
                'ufCrm_1_DEAL_ID': deal_id,
            }
        }
        
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
            created_item = result['result'].get('item', {})
            
            print(f"[DEBUG] Purchase created with ID: {purchase_id}")
            print(f"[DEBUG] ===== СОЗДАННАЯ ЗАКУПКА В БИТРИКС24 =====")
            print(f"[DEBUG] ID закупки: {purchase_id}")
            print(f"[DEBUG] Название: {title}")
            print(f"[DEBUG] Поля закупки:")
            print(json.dumps(created_item, ensure_ascii=False, indent=2))
            print(f"[DEBUG] Товары в закупке ({len(products)} шт.):")
            for idx, p in enumerate(products, 1):
                print(f"[DEBUG]   {idx}. {p.get('name')} - {p.get('quantity')} {p.get('measure')} x {p.get('price')} руб. = {p.get('total')} руб.")
            print(f"[DEBUG] ==========================================")
            
            return {
                'success': True,
                'purchase_id': purchase_id,
                'deal_id': deal_id,
                'title': title,
                'message': 'Закупка успешно создана в ЦРМ Обеспечение',
                'created_item_fields': created_item,
                'products_sent': products
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