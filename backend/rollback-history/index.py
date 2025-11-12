"""
Business: Получение истории откатов сделок из audit лога
Args: event с queryStringParameters {deal_id, limit}
Returns: JSON массив с историей действий
"""
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
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
    
    db_dsn = os.environ.get('DATABASE_URL')
    if not db_dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL not configured'})
        }
    
    params = event.get('queryStringParameters') or {}
    deal_id = params.get('deal_id')
    limit = int(params.get('limit', 100))
    
    conn = psycopg2.connect(db_dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if deal_id:
        cur.execute(
            """SELECT id, deal_id, action_type, change_id, previous_stage, new_stage,
                      deal_snapshot, performed_at, performed_by, reason, success, error_message
               FROM t_p8980362_bitrix_webhook_handl.rollback_logs
               WHERE deal_id = %s
               ORDER BY performed_at DESC
               LIMIT %s""",
            (deal_id, limit)
        )
    else:
        cur.execute(
            """SELECT id, deal_id, action_type, change_id, previous_stage, new_stage,
                      deal_snapshot, performed_at, performed_by, reason, success, error_message
               FROM t_p8980362_bitrix_webhook_handl.rollback_logs
               ORDER BY performed_at DESC
               LIMIT %s""",
            (limit,)
        )
    
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    logs = []
    for row in rows:
        logs.append({
            'id': row['id'],
            'deal_id': row['deal_id'],
            'action_type': row['action_type'],
            'change_id': row['change_id'],
            'previous_stage': row['previous_stage'],
            'new_stage': row['new_stage'],
            'deal_snapshot': row['deal_snapshot'],
            'performed_at': row['performed_at'].isoformat() if row['performed_at'] else None,
            'performed_by': row['performed_by'],
            'reason': row['reason'],
            'success': row['success'],
            'error_message': row['error_message']
        })
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'logs': logs,
            'total': len(logs)
        })
    }
