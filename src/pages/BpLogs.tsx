import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface BpLog {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'terminated' | 'unknown';
  started: string;
  user_id: string;
  document_id: string | string[];
  errors: string[];
  last_activity: string;
}

interface BpDetail {
  id: string;
  template_id: string;
  template_name: string;
  document_id: string | string[];
  started: string;
  started_by: string;
  status: string;
  modified: string;
  workflow_status: Record<string, any>;
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    modified: string;
    user_id: string;
  }>;
}

const BpLogs = () => {
  const [logs, setLogs] = useState<BpLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'db'>('api');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBp, setSelectedBp] = useState<string | null>(null);
  const [bpDetail, setBpDetail] = useState<BpDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();

  const BACKEND_URL = 'https://functions.poehali.dev/f6e71011-6a3a-4e15-b54b-774b4357063f';

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source,
        limit: '100',
        offset: '0'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${BACKEND_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки логов');
      }

      setLogs(data.logs || []);
      toast({
        title: 'Логи обновлены',
        description: `Загружено записей: ${data.logs?.length || 0}`,
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Неизвестная ошибка';
      setError(errorMessage);
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [source]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 10000); // Обновление каждые 10 секунд

    return () => clearInterval(interval);
  }, [autoRefresh, source, statusFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: string; label: string }> = {
      running: { variant: 'default', icon: 'Loader2', label: 'Выполняется' },
      completed: { variant: 'default', icon: 'CheckCircle2', label: 'Завершён' },
      error: { variant: 'destructive', icon: 'XCircle', label: 'Ошибка' },
      terminated: { variant: 'secondary', icon: 'StopCircle', label: 'Прерван' },
      template: { variant: 'outline', icon: 'FileCode', label: 'Шаблон' },
      unknown: { variant: 'outline', icon: 'HelpCircle', label: 'Неизвестно' },
    };

    const config = variants[status] || variants.unknown;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon name={config.icon} size={14} />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Нет данных';
    try {
      return new Date(dateString).toLocaleString('ru-RU');
    } catch {
      return dateString;
    }
  };

  const fetchBpDetail = async (bpId: string) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/detail?id=${bpId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка загрузки деталей');
      }

      setBpDetail(data);
      setSelectedBp(bpId);
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeBpDetail = () => {
    setSelectedBp(null);
    setBpDetail(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Мониторинг бизнес-процессов</h1>
            <p className="text-slate-600 mt-2">Отслеживание статусов и ошибок БП Битрикс24</p>
          </div>
          <Button onClick={() => window.history.back()} variant="outline">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Назад
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Settings" size={20} />
              Настройки мониторинга
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="source">Источник данных</Label>
                <Select value={source} onValueChange={(val: 'api' | 'db') => setSource(val)}>
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">REST API</SelectItem>
                    <SelectItem value="db">База данных</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Фильтр по статусу</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="running">Выполняются</SelectItem>
                    <SelectItem value="error">Ошибки</SelectItem>
                    <SelectItem value="completed">Завершённые</SelectItem>
                    <SelectItem value="terminated">Прерванные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Поиск по названию/ID</Label>
                <Input
                  id="search"
                  placeholder="Введите текст..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={fetchLogs} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                      Загрузка...
                    </>
                  ) : (
                    <>
                      <Icon name="RefreshCw" size={16} className="mr-2" />
                      Обновить
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="cursor-pointer">
                Автообновление каждые 10 секунд
              </Label>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <Icon name="AlertCircle" size={16} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Лента бизнес-процессов</CardTitle>
            <CardDescription>
              Найдено записей: {logs.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-500">
                <Icon name="FileQuestion" size={48} className="mx-auto mb-4 opacity-50" />
                <p>Нет данных для отображения</p>
                <p className="text-sm mt-2">Измените фильтры или обновите данные</p>
              </div>
            )}

            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="border-l-4" style={{
                  borderLeftColor: 
                    log.status === 'error' ? '#ef4444' :
                    log.status === 'running' ? '#3b82f6' :
                    log.status === 'completed' ? '#22c55e' :
                    '#94a3b8'
                }}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{log.name}</h3>
                          {getStatusBadge(log.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Icon name="Hash" size={14} />
                            <span>ID: {log.id}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="Calendar" size={14} />
                            <span>Запущен: {formatDate(log.started)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon name="User" size={14} />
                            <span>Пользователь: {log.user_id || 'Неизвестно'}</span>
                          </div>
                        </div>
                        
                        {!log.id.startsWith('template_') && (
                          <Button 
                            onClick={() => fetchBpDetail(log.id)} 
                            variant="outline" 
                            size="sm"
                            className="mt-2"
                          >
                            <Icon name="Eye" size={14} className="mr-2" />
                            Посмотреть детали
                          </Button>
                        )}

                        {log.errors && log.errors.length > 0 && (
                          <Alert variant="destructive" className="mt-3">
                            <Icon name="AlertTriangle" size={16} />
                            <AlertDescription>
                              <div className="font-semibold mb-1">Ошибки выполнения:</div>
                              <ul className="list-disc list-inside space-y-1">
                                {log.errors.map((err, idx) => (
                                  <li key={idx} className="text-sm">{err}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedBp && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Детали бизнес-процесса</CardTitle>
                <Button onClick={closeBpDetail} variant="ghost" size="sm">
                  <Icon name="X" size={16} />
                </Button>
              </div>
              <CardDescription>ID: {selectedBp}</CardDescription>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Icon name="Loader2" size={32} className="animate-spin text-primary" />
                </div>
              ) : bpDetail ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-600">Шаблон</div>
                      <div className="text-base">{bpDetail.template_name || 'Неизвестно'}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-600">ID шаблона</div>
                      <div className="text-base font-mono">{bpDetail.template_id}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-600">Запущен</div>
                      <div className="text-base">{formatDate(bpDetail.started)}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-600">Изменён</div>
                      <div className="text-base">{formatDate(bpDetail.modified)}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-600">Запустил</div>
                      <div className="text-base">ID: {bpDetail.started_by}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-slate-600">Документ</div>
                      <div className="text-base font-mono text-xs">
                        {Array.isArray(bpDetail.document_id) 
                          ? bpDetail.document_id.join(' / ') 
                          : bpDetail.document_id}
                      </div>
                    </div>
                  </div>

                  {bpDetail.tasks && bpDetail.tasks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Icon name="ListChecks" size={18} />
                        История задач ({bpDetail.tasks.length})
                      </h4>
                      <div className="space-y-2">
                        {bpDetail.tasks.map((task) => (
                          <Card key={task.id} className="bg-slate-50">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="font-medium">{task.name}</div>
                                  <div className="text-sm text-slate-600 mt-1">
                                    ID: {task.id} • Пользователь: {task.user_id}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    Изменено: {formatDate(task.modified)}
                                  </div>
                                </div>
                                {getStatusBadge(task.status)}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {bpDetail.workflow_status && Object.keys(bpDetail.workflow_status).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Icon name="Info" size={18} />
                        Статус процесса
                      </h4>
                      <pre className="bg-slate-50 p-4 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(bpDetail.workflow_status, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Не удалось загрузить детали
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BpLogs;