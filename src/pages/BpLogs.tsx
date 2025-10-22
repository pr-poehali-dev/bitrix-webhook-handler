import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { BpLog, BpDetail } from '@/components/bp-logs/types';
import BpLogsFilters from '@/components/bp-logs/BpLogsFilters';
import BpLogsList from '@/components/bp-logs/BpLogsList';

interface TimelineLog {
  ID: string;
  CREATED: string;
  AUTHOR_ID: string;
  SETTINGS?: {
    COMMENT?: string;
    TITLE?: string;
    MESSAGE?: string;
  };
  ASSOCIATED_ENTITY_TYPE_ID?: string;
  ASSOCIATED_ENTITY_ID?: string;
}

const BpLogs = () => {
  const [allBps, setAllBps] = useState<BpLog[]>([]);
  const [runningBps, setRunningBps] = useState<BpLog[]>([]);
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'api' | 'db'>('api');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBp, setSelectedBp] = useState<string | null>(null);
  const [bpDetail, setBpDetail] = useState<BpDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { toast } = useToast();

  const BP_LOGS_URL = 'https://functions.poehali.dev/f6e71011-6a3a-4e15-b54b-774b4357063f';
  const TIMELINE_URL = 'https://functions.poehali.dev/4cb6e52c-3777-4095-a59b-37d01e978ff6';

  const checkDbTables = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source: 'db',
        debug: '1'
      });

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      toast({
        title: 'Debug: Таблицы БД',
        description: JSON.stringify(data, null, 2),
        duration: 10000,
      });
      
      console.log('[DEBUG] Информация о таблицах:', data);
    } catch (err: any) {
      toast({
        title: 'Ошибка Debug',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBps = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Используем PHP API на сервере Битрикс24 для получения истории из БД
      const params = new URLSearchParams({
        source: 'db',
        limit: '100',
        offset: '0',
        showAll: 'true'
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки БП');
      }

      setAllBps(data.logs || []);
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

  const fetchRunningBps = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        source,
        limit: '100',
        offset: '0',
        status: 'running'
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${BP_LOGS_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки запущенных БП');
      }

      setRunningBps(data.logs || []);
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

  const fetchTimelineLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        limit: '50'
      });

      const response = await fetch(`${TIMELINE_URL}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Ошибка загрузки логов Timeline');
      }

      setTimelineLogs(data.logs || []);
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

  const handleRefresh = () => {
    if (activeTab === 'all') {
      fetchAllBps();
    } else if (activeTab === 'running') {
      fetchRunningBps();
    } else if (activeTab === 'timeline') {
      fetchTimelineLogs();
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllBps();
    } else if (activeTab === 'running') {
      fetchRunningBps();
    } else if (activeTab === 'timeline') {
      fetchTimelineLogs();
    }
  }, [activeTab, source]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, source, statusFilter, searchQuery]);

  const handleViewDetails = async (bpId: string) => {
    if (selectedBp === bpId) {
      setSelectedBp(null);
      setBpDetail(null);
      return;
    }

    if (bpId.startsWith('template_')) {
      setSelectedBp(bpId);
      setDetailLoading(true);
      
      try {
        const response = await fetch(`${BP_LOGS_URL}?id=${bpId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Ошибка загрузки статистики шаблона');
        }

        setBpDetail(data);
      } catch (err: any) {
        toast({
          title: 'Ошибка',
          description: err.message,
          variant: 'destructive',
        });
        setSelectedBp(null);
        setBpDetail(null);
      } finally {
        setDetailLoading(false);
      }
      return;
    }

    setSelectedBp(bpId);
    setDetailLoading(true);
    
    try {
      const response = await fetch(`${BP_LOGS_URL}?id=${bpId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка загрузки деталей');
      }

      setBpDetail(data);
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message,
        variant: 'destructive',
      });
      setSelectedBp(null);
      setBpDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Мониторинг бизнес-процессов</h1>
            <p className="text-slate-600 mt-2">Отслеживание статусов, запущенных БП и логов Битрикс24</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={checkDbTables} variant="secondary" disabled={loading}>
              <Icon name="Database" size={16} className="mr-2" />
              Debug БД
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              На главную
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              <Icon name="FolderTree" size={16} className="mr-2" />
              Все БП
            </TabsTrigger>
            <TabsTrigger value="running">
              <Icon name="Play" size={16} className="mr-2" />
              Запущенные
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Icon name="FileText" size={16} className="mr-2" />
              Логи Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <BpLogsFilters
              source={source}
              statusFilter={statusFilter}
              searchQuery={searchQuery}
              autoRefresh={autoRefresh}
              loading={loading}
              onSourceChange={setSource}
              onStatusFilterChange={setStatusFilter}
              onSearchQueryChange={setSearchQuery}
              onAutoRefreshChange={setAutoRefresh}
              onRefresh={handleRefresh}
            />

            {error && (
              <Alert variant="destructive">
                <Icon name="AlertCircle" size={16} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <BpLogsList
              logs={allBps}
              loading={loading}
              selectedBp={selectedBp}
              bpDetail={bpDetail}
              detailLoading={detailLoading}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="running" className="space-y-6">
            <BpLogsFilters
              source={source}
              statusFilter="running"
              searchQuery={searchQuery}
              autoRefresh={autoRefresh}
              loading={loading}
              onSourceChange={setSource}
              onStatusFilterChange={() => {}}
              onSearchQueryChange={setSearchQuery}
              onAutoRefreshChange={setAutoRefresh}
              onRefresh={handleRefresh}
            />

            {error && (
              <Alert variant="destructive">
                <Icon name="AlertCircle" size={16} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <BpLogsList
              logs={runningBps}
              loading={loading}
              selectedBp={selectedBp}
              bpDetail={bpDetail}
              detailLoading={detailLoading}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                >
                  <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Автообновление (10с)
                </label>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <Icon name="AlertCircle" size={16} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && timelineLogs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">Загрузка логов...</p>
              </div>
            ) : timelineLogs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <Icon name="FileText" size={48} className="mx-auto mb-4 text-slate-300" />
                <p className="text-slate-600">Логи Timeline не найдены</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timelineLogs.map((log) => (
                  <div key={log.ID} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {log.SETTINGS?.TITLE || 'Без заголовка'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          ID: {log.ID} • Автор: {log.AUTHOR_ID}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500">
                        {new Date(log.CREATED).toLocaleString('ru-RU')}
                      </div>
                    </div>

                    {log.SETTINGS?.MESSAGE && (
                      <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {log.SETTINGS.MESSAGE}
                        </p>
                      </div>
                    )}

                    {log.SETTINGS?.COMMENT && (
                      <div className="border-l-4 border-blue-500 pl-4">
                        <p className="text-sm text-slate-600 italic">
                          {log.SETTINGS.COMMENT}
                        </p>
                      </div>
                    )}

                    {(log.ASSOCIATED_ENTITY_TYPE_ID || log.ASSOCIATED_ENTITY_ID) && (
                      <div className="flex gap-4 mt-4 text-xs text-slate-500">
                        {log.ASSOCIATED_ENTITY_TYPE_ID && (
                          <span>Тип: {log.ASSOCIATED_ENTITY_TYPE_ID}</span>
                        )}
                        {log.ASSOCIATED_ENTITY_ID && (
                          <span>Entity ID: {log.ASSOCIATED_ENTITY_ID}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BpLogs;