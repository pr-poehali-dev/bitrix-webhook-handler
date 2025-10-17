import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface WebhookLog {
  id: number;
  webhook_type: string;
  inn: string;
  bitrix_company_id: string;
  request_body: string;
  response_status: string;
  duplicate_found: boolean;
  action_taken: string;
  created_at: string;
  source_info: string;
  request_method: string;
}

interface Stats {
  total_requests: number;
  duplicates_found: number;
  successful: number;
}

const API_URL = 'https://functions.poehali.dev/6a844be4-d079-4584-aa51-27ed6b95cb81';

export default function Index() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total_requests: 0, duplicates_found: 0, successful: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || { total_requests: 0, duplicates_found: 0, successful: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    setIsClearing(true);
    try {
      const response = await fetch(API_URL, {
        method: 'DELETE',
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const restoreCompany = async (log: WebhookLog) => {
    setRestoringId(log.id);
    try {
      console.log('Restoring log:', log);
      const requestBody = JSON.parse(log.request_body);
      console.log('Parsed request body:', requestBody);
      const companyData = requestBody.deleted_company_data;
      console.log('Company data:', companyData);
      
      if (!companyData) {
        alert('Данные для восстановления не найдены в логе. Возможно компания была удалена до обновления системы.');
        setRestoringId(null);
        return;
      }

      console.log('Sending restore request...');
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'restore',
          original_data: companyData,
        }),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response result:', result);
      
      if (result.success) {
        alert(`✅ Компания восстановлена с новым ID: ${result.company_id}`);
        await fetchData();
      } else {
        alert(`❌ Ошибка восстановления: ${result.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error restoring company:', error);
      alert('❌ Ошибка при восстановлении компании. Проверьте консоль браузера.');
    } finally {
      setRestoringId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Yekaterinburg',
    }).format(date);
  };

  const getStatusBadge = (status: string, duplicate: boolean) => {
    if (duplicate) {
      return <Badge variant="destructive" className="gap-1"><Icon name="AlertTriangle" size={12} />Дубликат</Badge>;
    }
    if (status === 'success') {
      return <Badge className="bg-primary gap-1"><Icon name="CheckCircle" size={12} />Успешно</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon name="Webhook" size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Битрикс24 Webhook Monitor</h1>
            <p className="text-muted-foreground">Мониторинг вебхуков и проверка дубликатов ИНН</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-muted-foreground flex items-center gap-2">
                <Icon name="Activity" size={16} />
                Всего запросов
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-foreground">{stats.total_requests}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-muted-foreground flex items-center gap-2">
                <Icon name="AlertTriangle" size={16} />
                Дубликаты найдено
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-accent">{stats.duplicates_found}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardDescription className="text-muted-foreground flex items-center gap-2">
                <Icon name="CheckCircle" size={16} />
                Успешных операций
              </CardDescription>
              <CardTitle className="text-4xl font-bold text-primary">{stats.successful}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-secondary">
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary">
              <Icon name="FileText" size={16} className="mr-2" />
              Журнал вебхуков
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-primary">
              <Icon name="Code" size={16} className="mr-2" />
              API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="mt-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Icon name="List" size={20} />
                      Входящие запросы
                    </CardTitle>
                    <CardDescription>История обработки вебхуков из Битрикс24</CardDescription>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={logs.length === 0 || isClearing}>
                        <Icon name="Trash2" size={16} className="mr-2" />
                        Очистить лог
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Подтвердите очистку</AlertDialogTitle>
                        <AlertDialogDescription>
                          Вы уверены, что хотите удалить все записи логов? Это действие нельзя отменить.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={clearLogs}>Очистить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Нет данных</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead className="text-muted-foreground">Дата и время</TableHead>
                          <TableHead className="text-muted-foreground">Метод</TableHead>
                          <TableHead className="text-muted-foreground">Источник</TableHead>
                          <TableHead className="text-muted-foreground">ИНН</TableHead>
                          <TableHead className="text-muted-foreground">ID компании</TableHead>
                          <TableHead className="text-muted-foreground">Статус</TableHead>
                          <TableHead className="text-muted-foreground">Действие</TableHead>
                          <TableHead className="text-muted-foreground w-[120px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const canRestore = log.duplicate_found && log.action_taken.includes('Auto-deleted');
                          
                          return (
                            <TableRow key={log.id} className="border-border">
                              <TableCell 
                                className="text-foreground font-mono text-sm cursor-pointer hover:bg-secondary/50"
                                onClick={() => setSelectedLog(log)}
                              >
                                {formatDate(log.created_at)}
                              </TableCell>
                              <TableCell
                                className="cursor-pointer hover:bg-secondary/50"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Badge variant={log.request_method === 'GET' ? 'outline' : 'secondary'} className="font-mono text-xs">
                                  {log.request_method || 'POST'}
                                </Badge>
                              </TableCell>
                              <TableCell 
                                className="text-muted-foreground text-xs max-w-[200px] truncate cursor-pointer hover:bg-secondary/50" 
                                title={log.source_info}
                                onClick={() => setSelectedLog(log)}
                              >
                                {log.source_info || 'Unknown'}
                              </TableCell>
                              <TableCell 
                                className="font-semibold text-primary cursor-pointer hover:bg-secondary/50"
                                onClick={() => setSelectedLog(log)}
                              >
                                {log.inn}
                              </TableCell>
                              <TableCell 
                                className="text-muted-foreground cursor-pointer hover:bg-secondary/50"
                                onClick={() => setSelectedLog(log)}
                              >
                                {log.bitrix_company_id}
                              </TableCell>
                              <TableCell
                                className="cursor-pointer hover:bg-secondary/50"
                                onClick={() => setSelectedLog(log)}
                              >
                                {getStatusBadge(log.response_status, log.duplicate_found)}
                              </TableCell>
                              <TableCell 
                                className="text-muted-foreground text-sm max-w-xs truncate cursor-pointer hover:bg-secondary/50"
                                onClick={() => setSelectedLog(log)}
                              >
                                {log.action_taken}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                {canRestore && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => restoreCompany(log)}
                                    disabled={restoringId === log.id}
                                  >
                                    <Icon name="Undo2" size={14} className="mr-1" />
                                    {restoringId === log.id ? 'Восстановление...' : 'Отменить'}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon name="Terminal" size={20} />
                  API для интеграции с Битрикс24
                </CardTitle>
                <CardDescription>Используйте этот endpoint в дизайнере бизнес-процессов</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Webhook URL:</p>
                  <code className="block p-3 bg-secondary rounded-md text-primary font-mono text-sm break-all">
                    {API_URL}
                  </code>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Метод:</p>
                  <Badge variant="outline" className="font-mono">POST</Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Формат запроса:</p>
                  <pre className="p-4 bg-secondary rounded-md text-foreground text-sm overflow-x-auto">
{`{
  "bitrix_id": "12345"
}`}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-2">
                    ИНН автоматически извлекается из Битрикс24 по ID компании
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Ответ при дубликате (автоудаление):</p>
                  <pre className="p-4 bg-secondary rounded-md text-foreground text-sm overflow-x-auto">
{`{
  "duplicate": true,
  "inn": "7707083893",
  "existing_company": {...},
  "action": "deleted",
  "deleted": true,
  "message": "Auto-deleted duplicate..."
}`}
                  </pre>
                </div>
                <div className="p-4 bg-accent/10 border border-accent/20 rounded-md">
                  <div className="flex items-start gap-2">
                    <Icon name="AlertCircle" size={16} className="text-accent mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-semibold mb-1">Автоматическое удаление новых дубликатов</p>
                      <p className="text-muted-foreground">
                        При обнаружении дубликата ИНН система автоматически удалит НОВУЮ компанию (которую только что создали) через Bitrix24 REST API. Старая компания сохраняется.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="Info" size={20} />
              Детали запроса #{selectedLog?.id}
            </DialogTitle>
            <DialogDescription>
              Полная информация о webhook запросе
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Дата и время</p>
                  <p className="text-sm font-mono">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Метод запроса</p>
                  <Badge variant={selectedLog.request_method === 'GET' ? 'outline' : 'secondary'} className="font-mono">
                    {selectedLog.request_method || 'POST'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Статус</p>
                {getStatusBadge(selectedLog.response_status, selectedLog.duplicate_found)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">ID компании</p>
                  <p className="text-sm font-mono">{selectedLog.bitrix_company_id || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">ИНН</p>
                  <p className="text-sm font-mono font-semibold text-primary">{selectedLog.inn || '—'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Источник запроса</p>
                <p className="text-xs font-mono bg-secondary p-2 rounded">{selectedLog.source_info || 'Unknown'}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Действие</p>
                <p className="text-sm">{selectedLog.action_taken}</p>
              </div>

              {(() => {
                try {
                  const requestBody = JSON.parse(selectedLog.request_body);
                  const searchDetails = requestBody.search_details;
                  
                  if (searchDetails) {
                    return (
                      <div className="space-y-2 p-4 bg-accent/10 border border-accent/20 rounded-md">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Icon name="Search" size={16} />
                          Результаты поиска дубликатов
                        </p>
                        <div className="space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-semibold text-muted-foreground">ИНН для поиска:</span>
                              <p className="font-mono text-primary">{searchDetails.inn_searched}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-muted-foreground">Всего найдено:</span>
                              <p className="font-mono">{searchDetails.total_found} компаний</p>
                            </div>
                          </div>
                          
                          <div>
                            <span className="font-semibold text-muted-foreground">Метод поиска:</span>
                            <p className="font-mono text-xs text-muted-foreground">{searchDetails.search_method}</p>
                          </div>
                          
                          {searchDetails.found_companies && searchDetails.found_companies.length > 0 && (
                            <div className="mt-3">
                              <p className="font-semibold text-muted-foreground mb-2">Найденные компании в Битрикс24:</p>
                              <div className="space-y-1">
                                {searchDetails.found_companies.map((company: any, idx: number) => (
                                  <div key={idx} className="p-2 bg-secondary rounded text-xs flex items-center justify-between">
                                    <div>
                                      <span className="font-mono font-semibold">ID: {company.ID}</span>
                                      {company.TITLE && <span className="ml-2 text-muted-foreground">— {company.TITLE}</span>}
                                    </div>
                                    {String(company.ID) === String(searchDetails.current_company_id) && (
                                      <Badge variant="outline" className="text-xs">Текущая</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {searchDetails.comparison_details && (
                            <div className="mt-3 p-2 bg-secondary/50 rounded">
                              <p className="font-semibold text-muted-foreground mb-1">Детали сравнения ID:</p>
                              <div className="space-y-1 text-xs">
                                <p>Текущая компания: <span className="font-mono">{searchDetails.comparison_details.bitrix_id}</span> ({searchDetails.comparison_details.bitrix_id_type})</p>
                                {searchDetails.comparison_details.found_ids_with_types && (
                                  <div>
                                    <p className="text-muted-foreground mt-1">Найденные ID с типами:</p>
                                    {searchDetails.comparison_details.found_ids_with_types.map((item: any, idx: number) => (
                                      <p key={idx} className="ml-2 font-mono">
                                        {item.id} ({item.type}) — {item.title}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  console.error('Error parsing search details:', e);
                }
                return null;
              })()}

              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Тело запроса (полное)</p>
                <pre className="text-xs bg-secondary p-3 rounded overflow-x-auto max-h-[300px]">
                  {JSON.stringify(JSON.parse(selectedLog.request_body), null, 2)}
                </pre>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Тип webhook</p>
                <Badge variant="outline">{selectedLog.webhook_type}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}