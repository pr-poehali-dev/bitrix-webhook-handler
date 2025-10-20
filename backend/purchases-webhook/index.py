"""
Business: Receives webhooks from Bitrix24, logs them, and triggers purchase creation
Args: event - dict with httpMethod, body (webhook data from Bitrix24)
      context - object with request_id attribute
Returns: HTTP response with success status
"""

import json
import os
from typing import Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'POST')
    
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
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            
            deal_id = str(body_data.get('deal_id', ''))
            webhook_event = body_data.get('event', 'OnCrmDealUpdate')
            company_id = str(body_data.get('company_id', ''))
            
            if not deal_id:
                return response_json(400, {
                    'success': False,
                    'error': 'deal_id is required'
                })
            
            headers = event.get('headers', {})
            user_agent = headers.get('User-Agent', headers.get('user-agent', 'Bitrix24'))
            source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'Unknown')
            source_info = f"IP: {source_ip} | UA: {user_agent[:100]}"
            
            cur.execute("""
                INSERT INTO purchase_webhooks 
                (deal_id, company_id, webhook_type, products_count, total_amount, source_info)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (deal_id, company_id, webhook_event, 0, 0, source_info))
            
            webhook_id = cur.fetchone()['id']
            conn.commit()
            
            return response_json(200, {
                'success': True,
                'message': f'Webhook received and logged',
                'webhook_id': webhook_id,
                'deal_id': deal_id,
                'request_id': context.request_id
            })
        
        elif method == 'GET':
            query_params = event.get('queryStringParameters', {}) or {}
            action = query_params.get('action', 'list_webhooks')
            
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
            
            return response_json(400, {
                'success': False,
                'error': f'Unknown action: {action}'
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
