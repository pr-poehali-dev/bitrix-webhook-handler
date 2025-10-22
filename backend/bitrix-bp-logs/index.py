'''
Business: Получение логов бизнес-процессов Битрикс24 через REST API или прямое подключение к БД
Args: event с httpMethod, queryStringParameters (source, limit, offset, status, search)
Returns: Список логов БП со статусами, ошибками, пользователями
'''
import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import requests

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    path: str = event.get('path', '')
    
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
    
    # Эндпоинт для детальной информации о БП
    if params.get('id'):
        bp_id = params.get('id')
        
        print(f"[DEBUG] Запрос деталей для ID: {bp_id}")
        
        try:
            if bp_id.startswith('template_'):
                print(f"[DEBUG] Это шаблон, загружаем статистику")
                template_id = bp_id.replace('template_', '')
                detail = get_template_stats(template_id)
                print(f"[DEBUG] Получены данные шаблона, ключи: {list(detail.keys())}")
            else:
                print(f"[DEBUG] Это экземпляр БП, загружаем детали")
                detail = get_bp_detail(bp_id)
            
            body_str = json.dumps(detail, ensure_ascii=False)
            print(f"[DEBUG] Отправляем ответ, длина body: {len(body_str)} символов")
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': body_str
            }
        except Exception as e:
            print(f"[ERROR] Ошибка получения деталей: {e}")
            import traceback
            traceback.print_exc()
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)}, ensure_ascii=False)
            }
    
    # Основной эндпоинт для списка логов
    source = params.get('source', 'api')
    limit = int(params.get('limit', '50'))
    offset = int(params.get('offset', '0'))
    status_filter = params.get('status')
    search_query = params.get('search')
    show_all = params.get('showAll', 'false').lower() == 'true'
    debug = params.get('debug', '0') == '1'
    
    try:
        if source == 'db':
            logs = get_logs_from_db(limit, offset, status_filter, search_query, debug)
        else:
            logs = get_logs_from_api(limit, offset, status_filter, search_query, show_all)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'logs': logs,
                'count': len(logs),
                'limit': limit,
                'offset': offset
            })
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[ERROR] Ошибка получения логов: {e}")
        print(f"[ERROR] Traceback:\n{error_details}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': str(e),
                'message': 'Ошибка получения логов',
                'traceback': error_details
            })
        }

def get_logs_from_api(limit: int, offset: int, status_filter: Optional[str], search: Optional[str], show_all: bool = False) -> List[Dict[str, Any]]:
    webhook_url = os.environ.get('BITRIX24_BP_WEBHOOK_URL') or os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_BP_WEBHOOK_URL не настроен')
    
    webhook_url = webhook_url.rstrip('/')
    print(f"[DEBUG] Используем webhook: {webhook_url[:50]}...")
    
    # Получаем список шаблонов БП с полной информацией
    templates_response = requests.post(
        f'{webhook_url}/bizproc.workflow.template.list',
        json={
            'SELECT': ['ID', 'NAME', 'DESCRIPTION', 'MODIFIED', 'USER_ID', 'DOCUMENT_TYPE']
        },
        timeout=30
    )
    templates_response.raise_for_status()
    templates_data = templates_response.json()
    
    print(f"[DEBUG] Получено шаблонов: {len(templates_data.get('result', []))}")
    
    if 'result' not in templates_data:
        raise ValueError(f'Ошибка API получения шаблонов: {templates_data.get("error_description", "Неизвестная ошибка")}')
    
    templates = {t['ID']: t for t in templates_data.get('result', [])}
    
    # Выводим первый шаблон для отладки
    if templates:
        first_template = list(templates.values())[0]
        print(f"[DEBUG] Пример шаблона: {first_template}")
        print(f"[DEBUG] Ключи шаблона: {list(first_template.keys())}")
    
    logs = []
    
    # Получаем список ВСЕХ экземпляров БП (активные + завершённые) через bizproc.workflow.instances
    instances_response = requests.post(
        f'{webhook_url}/bizproc.workflow.instances',
        json={
            'select': ['ID', 'MODIFIED', 'OWNED_UNTIL', 'MODULE_ID', 'ENTITY', 'DOCUMENT_ID', 'STARTED', 'STARTED_BY', 'TEMPLATE_ID', 'WORKFLOW_STATUS'],
            'order': {'STARTED': 'DESC'},
            'filter': {'>STARTED_BY': 0}  # Без фильтра по статусу - получаем все (активные и завершённые)
        },
        timeout=30
    )
    
    print(f"[DEBUG] Статус instances: {instances_response.status_code}")
    print(f"[DEBUG] URL запроса: {webhook_url}/bizproc.workflow.instances")
    
    if instances_response.status_code != 200:
        print(f"[DEBUG] Ошибка запроса instances: {instances_response.status_code}")
        # Если метод не работает, возвращаем информацию о шаблонах
        for template_id, template in list(templates.items())[:limit]:
            if search and search.lower() not in template.get('NAME', '').lower():
                continue
            
            logs.append({
                'id': template_id,
                'name': template.get('NAME', 'Без названия'),
                'status': 'template',
                'started': template.get('MODIFIED', ''),
                'user_id': template.get('USER_ID', ''),
                'document_id': '',
                'errors': [],
                'last_activity': template.get('MODIFIED', '')
            })
        return logs
    
    instances_data = instances_response.json()
    
    print(f"[DEBUG] Полный ответ API instances: {instances_data}")
    
    if 'error' in instances_data:
        print(f"[DEBUG] Ошибка API: {instances_data.get('error_description', 'Неизвестная ошибка')}")
    
    instances = instances_data.get('result', [])
    
    print(f"[DEBUG] Получено экземпляров БП: {len(instances)}")
    if instances:
        print(f"[DEBUG] Первый instance: {instances[0]}")
    else:
        print(f"[DEBUG] Instances пуст!")
    
    # Если нет экземпляров или запрошены все БП (show_all=True), показываем шаблоны
    if not instances or show_all:
        print(f"[DEBUG] Экземпляров нет или show_all=True, добавляем шаблоны")
        print(f"[DEBUG] Ключи templates: {list(templates.keys())}")
        for template_id, template in list(templates.items())[:limit]:
            if search and search.lower() not in template.get('NAME', '').lower():
                continue
            
            logs.append({
                'id': f"template_{template_id}",
                'name': template.get('NAME', 'Без названия'),
                'status': 'template',
                'started': template.get('MODIFIED', template.get('CREATED', '')),
                'user_id': str(template.get('USER_ID', '')),
                'document_id': template.get('DOCUMENT_TYPE', ''),
                'errors': [],
                'last_activity': template.get('MODIFIED', template.get('CREATED', ''))
            })
        
        # Если show_all=False и шаблоны добавлены, сразу возвращаем
        if not show_all:
            return logs
    
    for instance in instances:
        try:
            template_name = templates.get(instance.get('TEMPLATE_ID'), {}).get('NAME', 'Без названия')
            
            # Получаем детальные логи и ошибки
            errors = []
            workflow_state_data = {}
            try:
                log_response = requests.post(
                    f'{webhook_url}/bizproc.workflow.instances',
                    json={
                        'select': ['ID', 'WORKFLOW_STATE'],
                        'filter': {'ID': instance['ID']}
                    },
                    timeout=5
                )
                if log_response.status_code == 200:
                    detail_data = log_response.json()
                    if 'result' in detail_data and detail_data['result']:
                        workflow_state = detail_data['result'][0].get('WORKFLOW_STATE', {})
                        workflow_state_data = workflow_state
                        
                        # Проверяем наличие ошибок в состоянии БП
                        if isinstance(workflow_state, dict):
                            for activity_id, activity_data in workflow_state.items():
                                if isinstance(activity_data, dict):
                                    if activity_data.get('Type') == 'ExecuteError':
                                        error_msg = activity_data.get('Title', 'Ошибка выполнения активности')
                                        errors.append(f"Активность {activity_id}: {error_msg}")
                                    if 'Error' in activity_data:
                                        errors.append(f"Активность {activity_id}: {activity_data['Error']}")
            except Exception as e:
                print(f"[DEBUG] Ошибка получения деталей БП {instance['ID']}: {e}")
            
            # Определяем статус из WORKFLOW_STATUS
            workflow_status_code = instance.get('WORKFLOW_STATUS', {})
            if isinstance(workflow_status_code, dict):
                status_val = workflow_status_code.get('value', 0)
            else:
                status_val = workflow_status_code
            
            # Статусы: 0=running, 1=completed, 2=terminated, 3=error
            if errors or status_val == 3:
                status = 'error'
            elif status_val in [0]:
                status = 'running'
            elif status_val == 1:
                status = 'completed'
            elif status_val == 2:
                status = 'terminated'
            else:
                status = 'unknown'
            
            log_entry = {
                'id': instance['ID'],
                'name': instance.get('WORKFLOW_TEMPLATE_NAME') or template_name,
                'status': status,
                'started': instance.get('STARTED', ''),
                'user_id': str(instance.get('STARTED_BY', '')),
                'document_id': instance.get('DOCUMENT_ID', ''),
                'errors': errors,
                'last_activity': instance.get('MODIFIED', instance.get('STARTED', ''))
            }
            
            if status_filter and status != status_filter:
                continue
            
            if search:
                search_lower = search.lower()
                if (search_lower not in log_entry['name'].lower() and 
                    search_lower not in str(log_entry['id']).lower()):
                    continue
            
            logs.append(log_entry)
            
            if len(logs) >= limit:
                break
                
        except Exception as e:
            print(f"Ошибка обработки экземпляра {instance.get('ID')}: {e}")
            continue
    
    return logs[offset:offset + limit]

def get_bp_detail(bp_id: str) -> Dict[str, Any]:
    webhook_url = os.environ.get('BITRIX24_BP_WEBHOOK_URL') or os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_BP_WEBHOOK_URL не настроен')
    
    webhook_url = webhook_url.rstrip('/')
    
    # Получаем детальную информацию о БП через bizproc.workflow.instances с фильтром
    detail_response = requests.post(
        f'{webhook_url}/bizproc.workflow.instances',
        json={
            'select': ['ID', 'TEMPLATE_ID', 'TEMPLATE_NAME', 'DOCUMENT_ID', 'STARTED', 'STARTED_BY', 'MODIFIED', 'WORKFLOW_STATUS', 'WORKFLOW_STATE'],
            'filter': {'ID': bp_id}
        },
        timeout=30
    )
    detail_response.raise_for_status()
    detail_data = detail_response.json()
    
    # Извлекаем первый результат (должен быть единственный)
    if 'result' in detail_data and detail_data['result']:
        bp_info = detail_data['result'][0]
    else:
        bp_info = {}

    
    # Получаем задачи БП
    tasks = []
    try:
        tasks_response = requests.get(
            f'{webhook_url}/bizproc.task.list',
            params={
                'FILTER': {'WORKFLOW_ID': bp_id}
            },
            timeout=10
        )
        if tasks_response.status_code == 200:
            tasks_data = tasks_response.json()
            tasks = tasks_data.get('result', [])
    except:
        pass
    
    # Получаем историю выполнения БП (логи действий)
    history = []
    try:
        history_response = requests.post(
            f'{webhook_url}/bizproc.workflow.instance.getHistory',
            json={'ID': bp_id},
            timeout=10
        )
        if history_response.status_code == 200:
            history_data = history_response.json()
            history_items = history_data.get('result', [])
            
            print(f"[DEBUG] История БП {bp_id}: получено {len(history_items)} записей")
            
            for item in history_items:
                history.append({
                    'id': item.get('ID', ''),
                    'name': item.get('NAME', ''),
                    'modified': item.get('MODIFIED', ''),
                    'user_id': item.get('MODIFIED_BY', ''),
                    'execution_status': item.get('EXECUTION_STATUS', ''),
                    'execution_time': item.get('EXECUTION_TIME', ''),
                    'note': item.get('NOTE', ''),
                    'action': item.get('ACTION', ''),
                    'action_name': item.get('ACTION_NAME', '')
                })
    except Exception as e:
        print(f"[DEBUG] Ошибка получения истории: {e}")
    
    return {
        'id': bp_id,
        'template_id': bp_info.get('TEMPLATE_ID', ''),
        'template_name': bp_info.get('TEMPLATE_NAME', 'Неизвестно'),
        'document_id': bp_info.get('DOCUMENT_ID', ''),
        'started': bp_info.get('STARTED', ''),
        'started_by': bp_info.get('STARTED_BY', ''),
        'status': bp_info.get('STATUS', ''),
        'modified': bp_info.get('MODIFIED', ''),
        'workflow_status': bp_info.get('WORKFLOW_STATUS', {}),
        'tasks': [
            {
                'id': task.get('ID', ''),
                'name': task.get('NAME', 'Без названия'),
                'status': task.get('STATUS', 'unknown'),
                'modified': task.get('MODIFIED', ''),
                'user_id': task.get('USER_ID', '')
            }
            for task in tasks
        ],
        'history': history
    }

def get_template_stats(template_id: str) -> Dict[str, Any]:
    webhook_url = os.environ.get('BITRIX24_BP_WEBHOOK_URL') or os.environ.get('BITRIX24_WEBHOOK_URL')
    if not webhook_url:
        raise ValueError('BITRIX24_BP_WEBHOOK_URL не настроен')
    
    webhook_url = webhook_url.rstrip('/')
    print(f"[DEBUG] get_template_stats использует webhook: {webhook_url[:50]}...")
    
    template_response = requests.post(
        f'{webhook_url}/bizproc.workflow.template.list',
        json={
            'SELECT': ['ID', 'NAME', 'DESCRIPTION', 'MODIFIED', 'USER_ID', 'DOCUMENT_TYPE']
        },
        timeout=30
    )
    template_response.raise_for_status()
    template_data = template_response.json()
    templates_list = template_data.get('result', [])
    templates = {t['ID']: t for t in templates_list} if isinstance(templates_list, list) else templates_list
    
    print(f"[DEBUG] Загружено шаблонов: {len(templates)}")
    print(f"[DEBUG] Ищем template_id='{template_id}' в ключах: {list(templates.keys())}")
    template_info = templates.get(str(template_id), {})
    if template_info:
        print(f"[DEBUG] Шаблон найден! Ключи: {list(template_info.keys())}")
        print(f"[DEBUG] Содержимое шаблона: {template_info}")
    else:
        print(f"[DEBUG] Шаблон НЕ найден в словаре")
    
    # Используем bizproc.workflow.instances для получения ВСЕХ экземпляров (включая завершённые)
    instances_response = requests.post(
        f'{webhook_url}/bizproc.workflow.instances',
        json={
            'select': ['ID', 'TEMPLATE_ID', 'DOCUMENT_ID', 'MODIFIED', 'STARTED', 'STARTED_BY', 'WORKFLOW_STATUS'],
            'filter': {'TEMPLATE_ID': template_id}
        },
        timeout=30
    )
    
    print(f"[DEBUG] Статус запроса instances для template_id={template_id}: {instances_response.status_code}")
    
    instances = []
    if instances_response.status_code == 200:
        instances_data = instances_response.json()
        print(f"[DEBUG] Ответ API instances: {instances_data}")
        instances = instances_data.get('result', [])
        print(f"[DEBUG] Получено экземпляров для шаблона {template_id}: {len(instances)}")
    else:
        print(f"[DEBUG] Ошибка запроса: {instances_response.status_code}, текст: {instances_response.text[:200]}")
    
    runs_by_user = {}
    runs_by_date = {}
    total_runs = len(instances)
    
    for instance in instances:
        user_id = str(instance.get('STARTED_BY', 'unknown'))
        started = instance.get('STARTED', '')
        
        if user_id not in runs_by_user:
            runs_by_user[user_id] = {'count': 0, 'last_run': ''}
        runs_by_user[user_id]['count'] += 1
        if started > runs_by_user[user_id]['last_run']:
            runs_by_user[user_id]['last_run'] = started
        
        if started:
            date_key = started.split('T')[0] if 'T' in started else started[:10]
            runs_by_date[date_key] = runs_by_date.get(date_key, 0) + 1
    
    recent_runs = sorted(instances, key=lambda x: x.get('STARTED', ''), reverse=True)[:10]
    
    result = {
        'id': f'template_{template_id}',
        'template_id': template_id,
        'template_name': template_info.get('NAME', 'Неизвестно'),
        'document_id': template_info.get('DOCUMENT_TYPE', 'Не указан'),
        'started': template_info.get('CREATED', ''),
        'started_by': str(template_info.get('USER_ID', '')),
        'modified': template_info.get('MODIFIED', ''),
        'workflow_status': {},
        'tasks': [],
        'history': [],
        'stats': {
            'total_runs': total_runs,
            'runs_by_user': [
                {'user_id': user_id, 'count': data['count'], 'last_run': data['last_run']}
                for user_id, data in sorted(runs_by_user.items(), key=lambda x: x[1]['count'], reverse=True)
            ],
            'runs_by_date': [
                {'date': date, 'count': count}
                for date, count in sorted(runs_by_date.items(), reverse=True)[:30]
            ],
            'recent_runs': [
                {
                    'id': run.get('ID', ''),
                    'started': run.get('STARTED', ''),
                    'started_by': str(run.get('STARTED_BY', '')),
                    'document_id': run.get('DOCUMENT_ID', '')
                }
                for run in recent_runs
            ]
        }
    }
    
    print(f"[DEBUG] Возвращаем данные шаблона: id={result['id']}, total_runs={result['stats']['total_runs']}")
    return result

def get_logs_from_db(limit: int, offset: int, status_filter: Optional[str], search: Optional[str], debug: bool = False) -> List[Dict[str, Any]]:
    """Получение истории БП через PHP API на сервере Битрикс24"""
    
    # URL PHP-скрипта на сервере Битрикс24
    php_api_url = os.environ.get('BITRIX24_BP_HISTORY_API_URL')
    
    if not php_api_url:
        # Пытаемся построить URL из webhook
        webhook_url = os.environ.get('BITRIX24_BP_WEBHOOK_URL') or os.environ.get('BITRIX24_WEBHOOK_URL')
        if webhook_url:
            # Извлекаем базовый домен из webhook (например: https://itpood.ru)
            base_url = webhook_url.split('/rest/')[0] if '/rest/' in webhook_url else webhook_url.rstrip('/')
            php_api_url = f"{base_url}/local/api/bp-history.php"
        else:
            raise ValueError('BITRIX24_BP_HISTORY_API_URL не настроен')
    
    print(f"[DEBUG DB] Запрос к PHP API: {php_api_url}")
    
    # Формируем параметры запроса
    params = {
        'limit': str(limit),
        'offset': str(offset)
    }
    
    if debug:
        params['debug'] = '1'
    
    if status_filter:
        params['status'] = status_filter
    
    if search:
        params['search'] = search
    
    # Выполняем HTTP-запрос к PHP API
    response = requests.get(php_api_url, params=params, timeout=30)
    
    print(f"[DEBUG DB] Статус ответа PHP API: {response.status_code}")
    
    if response.status_code != 200:
        raise ValueError(f"PHP API вернул ошибку: {response.status_code}, текст: {response.text[:500]}")
    
    data = response.json()
    
    if not data.get('success', False):
        raise ValueError(f"PHP API вернул ошибку: {data.get('error', 'Неизвестная ошибка')}")
    
    logs = data.get('logs', [])
    print(f"[DEBUG DB] Получено логов из PHP API: {len(logs)}")
    
    return logs