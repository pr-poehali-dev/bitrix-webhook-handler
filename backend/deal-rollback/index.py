"""
Business: Откат сделки в предыдущее состояние через Битрикс24 API с логированием
Args: event с body {deal_id, target_stage_id, change_id, performed_by, reason}
Returns: JSON с результатом операции
"""
import json
import os
from typing import Dict, Any
import urllib.request
import urllib.error
import psycopg2
from psycopg2.extras import Json

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    deal_id = body_data.get('deal_id')
    target_stage = body_data.get('target_stage_id')
    change_id = body_data.get('change_id')
    performed_by = body_data.get('performed_by', 'system')
    reason = body_data.get('reason', 'Manual rollback')
    
    if not deal_id or not target_stage:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'deal_id and target_stage_id required'})
        }
    
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    db_dsn = os.environ.get('DATABASE_URL')
    
    if not webhook_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'BITRIX24_WEBHOOK_URL not configured'})
        }
    
    # Получаем текущее состояние сделки перед откатом
    deal_snapshot = None
    current_stage = None
    if db_dsn:
        try:
            conn = psycopg2.connect(db_dsn)
            cur = conn.cursor()
            cur.execute(
                "SELECT deal_data FROM t_p8980362_bitrix_webhook_handl.deal_changes WHERE deal_id = %s ORDER BY id DESC LIMIT 1",
                (deal_id,)
            )
            row = cur.fetchone()
            if row and row[0]:
                deal_snapshot = row[0]
                current_stage = deal_snapshot.get('STAGE_ID')
            cur.close()
            conn.close()
        except Exception:
            pass
    
    update_url = f"{webhook_url}/crm.deal.update"
    
    update_data = {
        'id': deal_id,
        'fields': {
            'STAGE_ID': target_stage
        }
    }
    
    req = urllib.request.Request(
        update_url,
        data=json.dumps(update_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    success = False
    error_msg = None
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if result.get('result'):
                success = True
            else:
                error_msg = result.get('error_description', 'Unknown error')
    
    except urllib.error.HTTPError as e:
        error_msg = f'Bitrix24 API error: {e.read().decode("utf-8")}'
    except Exception as e:
        error_msg = str(e)
    
    # Логируем операцию в БД
    if db_dsn:
        try:
            conn = psycopg2.connect(db_dsn)
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO t_p8980362_bitrix_webhook_handl.rollback_logs 
                   (deal_id, action_type, change_id, previous_stage, new_stage, deal_snapshot, 
                    performed_by, reason, success, error_message)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                (deal_id, 'rollback', change_id, current_stage, target_stage, 
                 Json(deal_snapshot) if deal_snapshot else None,
                 performed_by, reason, success, error_msg)
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception:
            pass
    
    if success:
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({
                'success': True,
                'deal_id': deal_id,
                'new_stage': target_stage,
                'message': f'Сделка #{deal_id} откачена на стадию {target_stage}'
            })
        }
    else:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': False,
                'error': error_msg
            })
        }