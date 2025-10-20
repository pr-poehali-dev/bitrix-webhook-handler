"""
Business: Integrates with Bitrix24 API to fetch deal products and create purchases in smart process
Args: event - dict with httpMethod, queryStringParameters (deal_id), body (purchase data)
      context - object with request_id attribute
Returns: HTTP response with products list or purchase creation result
"""

import json
import os
from typing import Dict, Any, List
import urllib.request
import urllib.parse
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
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
    
    bitrix_webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    smart_process_id = os.environ.get('SMART_PROCESS_PURCHASES_ID', '')
    
    if not bitrix_webhook_url:
        return response_json(500, {
            'success': False,
            'error': 'BITRIX24_WEBHOOK_URL not configured'
        })
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            deal_id = query_params.get('deal_id', '').strip()
            action = query_params.get('action', '')
            
            if action == 'list_purchases':
                cur.execute("""
                    SELECT * FROM purchases 
                    ORDER BY created_at DESC 
                    LIMIT 100
                """)
                purchases = cur.fetchall()
                
                return response_json(200, {
                    'success': True,
                    'purchases': [dict(p) for p in purchases]
                })
            
            if action == 'list_webhooks':
                cur.execute("""
                    SELECT * FROM purchase_webhooks 
                    ORDER BY created_at DESC 
                    LIMIT 100
                """)
                webhooks = cur.fetchall()
                
                return response_json(200, {
                    'success': True,
                    'webhooks': [dict(w) for w in webhooks]
                })
            
            if not deal_id:
                return response_json(400, {
                    'success': False,
                    'error': 'deal_id parameter required'
                })
            
            products = get_deal_products(bitrix_webhook_url, deal_id)
            
            if 'error' in products:
                return response_json(400, {
                    'success': False,
                    'error': products['error']
                })
            
            return response_json(200, {
                'success': True,
                'products': products['products'],
                'total_items': len(products['products']),
                'deal_id': deal_id
            })
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action', 'create_purchase')
            
            if action == 'create_purchase':
                deal_id = body_data.get('deal_id', '').strip()
                products = body_data.get('products', [])
                
                if not deal_id:
                    return response_json(400, {
                        'success': False,
                        'error': 'deal_id required'
                    })
                
                if not products:
                    return response_json(400, {
                        'success': False,
                        'error': 'products list required'
                    })
                
                if not smart_process_id:
                    return response_json(500, {
                        'success': False,
                        'error': 'SMART_PROCESS_PURCHASES_ID not configured'
                    })
                
                purchase_result = create_purchase_in_bitrix(
                    bitrix_webhook_url,
                    smart_process_id,
                    deal_id,
                    products
                )
                
                if 'error' in purchase_result:
                    return response_json(400, {
                        'success': False,
                        'error': purchase_result['error']
                    })
                
                purchase_id = purchase_result['purchase_id']
                total_amount = sum(p['total'] for p in products)
                
                cur.execute("""
                    INSERT INTO purchases 
                    (purchase_id, deal_id, title, status, products_count, total_amount)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    purchase_id,
                    deal_id,
                    f'Закупка по сделке #{deal_id}',
                    'new',
                    len(products),
                    total_amount
                ))
                
                conn.commit()
                
                return response_json(200, {
                    'success': True,
                    'purchase_id': purchase_id,
                    'products_count': len(products),
                    'total_amount': total_amount
                })
        
        return response_json(405, {'error': 'Method not allowed'})
        
    except Exception as e:
        conn.rollback()
        return response_json(500, {
            'success': False,
            'error': str(e)
        })
    finally:
        cur.close()
        conn.close()

def get_deal_products(webhook_url: str, deal_id: str) -> Dict[str, Any]:
    """Get products from Bitrix24 deal using crm.deal.productrows.get"""
    try:
        api_url = f"{webhook_url}crm.deal.productrows.get.json"
        params = {'id': deal_id}
        
        data = urllib.parse.urlencode(params).encode('utf-8')
        req = urllib.request.Request(api_url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if 'result' not in result:
            return {'error': 'Failed to fetch products from Bitrix24'}
        
        products = []
        for item in result['result']:
            products.append({
                'id': str(item.get('PRODUCT_ID', '')),
                'name': item.get('PRODUCT_NAME', 'Неизвестный товар'),
                'quantity': float(item.get('QUANTITY', 0)),
                'price': float(item.get('PRICE', 0)),
                'total': float(item.get('PRICE', 0)) * float(item.get('QUANTITY', 0)),
                'measure': item.get('MEASURE_NAME', 'шт')
            })
        
        return {'products': products}
        
    except Exception as e:
        return {'error': f'Bitrix24 API error: {str(e)}'}

def create_purchase_in_bitrix(webhook_url: str, entity_type_id: str, deal_id: str, products: List[Dict]) -> Dict[str, Any]:
    """Create purchase in Bitrix24 smart process using crm.item.add"""
    try:
        api_url = f"{webhook_url}crm.item.add.json"
        
        total_amount = sum(p['total'] for p in products)
        products_text = '\n'.join([
            f"{i+1}. {p['name']} - {p['quantity']} {p['measure']} x {p['price']} ₽ = {p['total']} ₽"
            for i, p in enumerate(products)
        ])
        
        params = {
            'entityTypeId': entity_type_id,
            'fields': {
                'title': f'Закупка по сделке #{deal_id}',
                'ufCrm_1_DEAL_ID': deal_id,
                'ufCrm_1_TOTAL_AMOUNT': total_amount,
                'ufCrm_1_PRODUCTS': products_text,
                'ufCrm_1_STATUS': 'new'
            }
        }
        
        data = urllib.parse.urlencode({'fields': json.dumps(params['fields']), 'entityTypeId': entity_type_id}).encode('utf-8')
        req = urllib.request.Request(api_url, data=data)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        if 'result' not in result or 'item' not in result['result']:
            return {'error': 'Failed to create purchase in Bitrix24'}
        
        purchase_id = str(result['result']['item']['id'])
        
        return {'purchase_id': purchase_id}
        
    except Exception as e:
        return {'error': f'Bitrix24 API error: {str(e)}'}

def response_json(status_code: int, data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps(data, ensure_ascii=False, default=str)
    }
