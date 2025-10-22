"""
Business: Обогащает записи изменений сделок именами пользователей из Битрикс24
Args: event с queryStringParameters (limit для количества записей)
Returns: JSON с количеством обновлённых записей
"""
import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import urllib.parse

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
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    params = event.get('queryStringParameters') or {}
    limit = int(params.get('limit', '50'))
    
    webhook_url = os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'BITRIX24_WEBHOOK_URL not configured'}),
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'DATABASE_URL not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Находим записи без имён пользователей
    cursor.execute(f"""
        SELECT DISTINCT modifier_user_id 
        FROM deal_changes 
        WHERE modifier_user_id IS NOT NULL 
        AND modifier_user_id != '' 
        AND (modifier_user_name IS NULL OR modifier_user_name = '' OR modifier_user_name LIKE 'Пользователь #%')
        LIMIT {limit}
    """)
    
    rows = cursor.fetchall()
    user_ids = [row['modifier_user_id'] for row in rows]
    
    if not user_ids:
        cursor.close()
        conn.close()
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Нет записей для обогащения',
                'updated': 0
            }),
            'isBase64Encoded': False
        }
    
    # Получаем данные пользователей из Битрикс24
    updated_count = 0
    user_cache = {}
    
    for user_id in user_ids:
        if user_id in user_cache:
            continue
            
        try:
            user_url = f"{webhook_url}user.get.json"
            user_params = urllib.parse.urlencode({'ID': user_id})
            user_req = urllib.request.Request(f"{user_url}?{user_params}")
            
            with urllib.request.urlopen(user_req, timeout=5) as user_response:
                user_data = json.loads(user_response.read().decode('utf-8'))
            
            if user_data.get('result') and len(user_data['result']) > 0:
                user = user_data['result'][0]
                user_name = f"{user.get('NAME', '')} {user.get('LAST_NAME', '')}".strip()
                
                if user_name:
                    user_cache[user_id] = user_name
                    
                    # Обновляем все записи этого пользователя
                    cursor.execute("""
                        UPDATE deal_changes 
                        SET modifier_user_name = %s 
                        WHERE modifier_user_id = %s 
                        AND (modifier_user_name IS NULL OR modifier_user_name = '' OR modifier_user_name LIKE 'Пользователь #%%')
                    """, (user_name, user_id))
                    
                    updated_count += cursor.rowcount
                    print(f"[INFO] Обновлено {cursor.rowcount} записей для пользователя {user_name}")
        
        except Exception as e:
            print(f"[WARN] Не удалось получить данные пользователя {user_id}: {e}")
            continue
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'success': True,
            'message': f'Обновлено {updated_count} записей',
            'updated': updated_count,
            'users_processed': len(user_cache),
            'user_names': list(user_cache.values())
        }, ensure_ascii=False)
    }
