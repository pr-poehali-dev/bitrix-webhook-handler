<?php
/**
 * API для получения истории бизнес-процессов Битрикс24 из базы данных
 * 
 * Разместите этот файл на сервере Битрикс24 в любой доступной директории
 * Например: /local/api/bp-history.php
 * 
 * URL для доступа: https://itpood.ru/local/api/bp-history.php
 * 
 * Параметры GET:
 * - limit: количество записей (по умолчанию 50)
 * - offset: смещение (по умолчанию 0)
 * - status: фильтр по статусу (running, completed, error)
 * - search: поиск по названию
 */

// CORS для доступа из внешних приложений
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Подключение к БД Битрикс24
require_once($_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php');

use Bitrix\Main\Application;
use Bitrix\Main\Loader;

try {
    // Получаем параметры запроса
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $statusFilter = isset($_GET['status']) ? $_GET['status'] : '';
    $search = isset($_GET['search']) ? $_GET['search'] : '';
    $debug = isset($_GET['debug']) ? true : false;
    
    // Получаем подключение к БД
    $connection = Application::getConnection();
    
    // Режим отладки - показываем все доступные таблицы и их количество записей
    if ($debug) {
        $tables = [
            'b_bp_workflow_instance' => 'SELECT COUNT(*) as cnt FROM b_bp_workflow_instance',
            'b_bp_workflow_template' => 'SELECT COUNT(*) as cnt FROM b_bp_workflow_template',
            'b_bp_tracking' => 'SELECT COUNT(*) as cnt FROM b_bp_tracking',
            'b_bp_task' => 'SELECT COUNT(*) as cnt FROM b_bp_task'
        ];
        
        $debugInfo = [];
        foreach ($tables as $tableName => $query) {
            try {
                $result = $connection->query($query);
                $row = $result->fetch();
                $debugInfo[$tableName] = intval($row['cnt']);
            } catch (Exception $e) {
                $debugInfo[$tableName] = 'Error: ' . $e->getMessage();
            }
        }
        
        echo json_encode([
            'success' => true,
            'debug' => true,
            'table_counts' => $debugInfo
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    // Формируем SQL-запрос
    $sql = "
        SELECT 
            wi.ID as id,
            wt.NAME as name,
            wi.STARTED as started,
            wi.STARTED_BY as user_id,
            wi.DOCUMENT_ID as document_id,
            wi.MODIFIED as modified,
            wi.STATUS as status_code,
            wi.WORKFLOW_TEMPLATE_ID as template_id,
            GROUP_CONCAT(
                CONCAT(t.MODIFIED, '|', t.TYPE, '|', t.ACTION_NAME)
                ORDER BY t.MODIFIED DESC
                SEPARATOR ';;;'
            ) as tracking_logs
        FROM b_bp_workflow_instance wi
        LEFT JOIN b_bp_workflow_template wt ON wi.WORKFLOW_TEMPLATE_ID = wt.ID
        LEFT JOIN b_bp_tracking t ON wi.ID = t.WORKFLOW_ID
        WHERE 1=1
    ";
    
    $params = [];
    
    // Фильтр по поиску
    if (!empty($search)) {
        $sql .= " AND (wt.NAME LIKE ? OR wi.ID LIKE ?)";
        $searchPattern = '%' . $search . '%';
        $params[] = $searchPattern;
        $params[] = $searchPattern;
    }
    
    // Фильтр по статусу
    // Статусы БП в Битрикс24: 1=running, 2=paused, 3=terminated, 4=completed
    if (!empty($statusFilter)) {
        if ($statusFilter === 'running') {
            $sql .= " AND wi.STATUS IN (1, 2)";
        } elseif ($statusFilter === 'completed') {
            $sql .= " AND wi.STATUS = 4";
        } elseif ($statusFilter === 'error') {
            $sql .= " AND wi.STATUS = 3";
        }
    }
    
    $sql .= " GROUP BY wi.ID ORDER BY wi.STARTED DESC LIMIT ? OFFSET ?";
    $params[] = $limit;
    $params[] = $offset;
    
    // Заменяем placeholders на реальные значения (Битрикс использует свой метод)
    // Используем sqlHelper для безопасной подстановки
    $sqlHelper = $connection->getSqlHelper();
    
    // Подставляем параметры вручную (безопасно через sqlHelper)
    foreach ($params as $param) {
        if (is_int($param)) {
            $sql = preg_replace('/\?/', $param, $sql, 1);
        } else {
            $escapedParam = $sqlHelper->forSql($param);
            $sql = preg_replace('/\?/', "'{$escapedParam}'", $sql, 1);
        }
    }
    
    // Выполняем запрос
    $result = $connection->query($sql);
    
    $logs = [];
    while ($row = $result->fetch()) {
        // Парсим логи трекинга
        $errors = [];
        $tracking = [];
        
        if (!empty($row['tracking_logs'])) {
            $logEntries = explode(';;;', $row['tracking_logs']);
            foreach ($logEntries as $logEntry) {
                $parts = explode('|', $logEntry);
                if (count($parts) >= 3) {
                    list($logTime, $logType, $actionName) = $parts;
                    
                    $tracking[] = [
                        'time' => $logTime,
                        'type' => $logType,
                        'action' => $actionName
                    ];
                    
                    // Тип 6 = ошибка в b_bp_tracking
                    if ($logType == '6') {
                        $errors[] = $actionName;
                    }
                }
            }
        }
        
        // Определяем статус
        $statusCode = intval($row['status_code']);
        if (!empty($errors) || $statusCode == 3) {
            $status = 'error';
        } elseif ($statusCode == 1 || $statusCode == 2) {
            $status = 'running';
        } elseif ($statusCode == 4) {
            $status = 'completed';
        } else {
            $status = 'unknown';
        }
        
        $logs[] = [
            'id' => (string)$row['id'],
            'name' => $row['name'] ?: 'Без названия',
            'status' => $status,
            'started' => $row['started'],
            'user_id' => (string)$row['user_id'],
            'document_id' => $row['document_id'],
            'errors' => $errors,
            'last_activity' => $row['modified'],
            'template_id' => (string)$row['template_id'],
            'tracking' => array_slice($tracking, 0, 10) // Первые 10 записей
        ];
    }
    
    // Формируем ответ
    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'count' => count($logs),
        'limit' => $limit,
        'offset' => $offset
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Ошибка получения данных из БД'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}