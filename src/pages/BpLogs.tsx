import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { BpLog, BpDetail } from '@/components/bp-logs/types';
import BpLogsFilters from '@/components/bp-logs/BpLogsFilters';
import BpLogsList from '@/components/bp-logs/BpLogsList';
import BpDetailView from '@/components/bp-logs/BpDetailView';

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
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, source, statusFilter, searchQuery]);

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
          onRefresh={fetchLogs}
        />

        {error && (
          <Alert variant="destructive">
            <Icon name="AlertCircle" size={16} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <BpLogsList
          logs={logs}
          loading={loading}
          onViewDetails={fetchBpDetail}
        />

        {selectedBp && (
          <BpDetailView
            bpDetail={bpDetail}
            loading={detailLoading}
            onClose={closeBpDetail}
          />
        )}
      </div>
    </div>
  );
};

export default BpLogs;
