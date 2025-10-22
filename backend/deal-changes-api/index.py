"""
Business: Получение истории изменений сделок из базы данных
Args: event с queryStringParameters (limit, offset, search)
Returns: JSON с массивом изменений сделок
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
    
    params = event.get('queryStringParameters') or {}
    limit = int(params.get('limit', '50'))
    offset = int(params.get('offset', '0'))
    search = params.get('search', '')
    deal_id = params.get('deal_id', '')
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL not configured'})
        }
    
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    query = "SELECT id, deal_id, event_type, deal_data, timestamp_received FROM deal_changes WHERE 1=1"
    query_params = []
    
    if deal_id:
        query += f" AND deal_id = '{deal_id}'"
    
    if search:
        search_escaped = search.replace("'", "''")
        query += f" AND (deal_id LIKE '%{search_escaped}%' OR deal_data::text LIKE '%{search_escaped}%')"
    
    query += f" ORDER BY timestamp_received DESC LIMIT {limit} OFFSET {offset}"
    
    cursor.execute(query)
    rows = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    changes = []
    for row in rows:
        changes.append({
            'id': row['id'],
            'deal_id': row['deal_id'],
            'event_type': row['event_type'],
            'deal_data': row['deal_data'],
            'timestamp_received': row['timestamp_received'].isoformat() if row['timestamp_received'] else None
        })
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'success': True,
            'changes': changes,
            'count': len(changes)
        })
    }
