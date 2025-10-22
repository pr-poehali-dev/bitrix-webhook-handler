import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DealChange {
  id: number;
  deal_id: string;
  event_type: string;
  deal_data: any;
  timestamp_received: string;
  modifier_user_id?: string;
  modifier_user_name?: string;
  previous_stage?: string;
  current_stage?: string;
  changes_summary?: any;
}

const BACKEND_URL = 'https://functions.poehali.dev/fa7ea1c4-cbac-4964-b75e-c5b527e353c7';

const STAGE_NAMES: Record<string, string> = {
  'NEW': 'Новая',
  'PREPARATION': 'Подготовка',
  'CLIENT': 'Согласование с клиентом',
  'EXECUTING': 'Выполнение',
  'FINAL_INVOICE': 'Финальный счёт',
  'WON': 'Успешно реализована',
  'LOSE': 'Закрыта и не реализована',
};

export default function DealChanges() {
  const [changes, setChanges] = useState<DealChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { toast } = useToast();

  const fetchChanges = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
      });
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const response = await fetch(`${BACKEND_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();
      setChanges(data.changes || []);
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message || 'Не удалось загрузить историю изменений',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchChanges();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, searchQuery]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getStageBadge = (stageId: string) => {
    const stageName = STAGE_NAMES[stageId] || stageId;
    const variants: Record<string, any> = {
      'NEW': 'default',
      'PREPARATION': 'secondary',
      'CLIENT': 'outline',
      'EXECUTING': 'default',
      'FINAL_INVOICE': 'secondary',
      'WON': 'default',
      'LOSE': 'destructive',
    };
    
    return (
      <Badge variant={variants[stageId] || 'outline'}>
        {stageName}
      </Badge>
    );
  };

  const renderChangeSummary = (change: DealChange) => {
    if (change.changes_summary?.stage) {
      const { from, to } = change.changes_summary.stage;
      return (
        <div className="flex items-center gap-2">
          {getStageBadge(from)}
          <Icon name="ArrowRight" size={14} className="text-slate-400" />
          {getStageBadge(to)}
        </div>
      );
    }
    
    if (change.current_stage && !change.previous_stage) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">Новая:</span>
          {getStageBadge(change.current_stage)}
        </div>
      );
    }
    
    return <span className="text-slate-400 text-xs">—</span>;
  };

  const filteredChanges = changes.filter((change) => {
    if (!searchQuery.trim()) return true;
    const search = searchQuery.toLowerCase();
    const dealData = change.deal_data || {};
    return (
      change.deal_id.toLowerCase().includes(search) ||
      (dealData.TITLE || '').toLowerCase().includes(search) ||
      (dealData.STAGE_ID || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">История изменений сделок</h1>
            <p className="text-slate-600 mt-2">Отслеживание всех изменений в сделках Битрикс24</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.href = '/'} variant="outline">
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              На главную
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Фильтры и настройки</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Icon name={autoRefresh ? 'PauseCircle' : 'PlayCircle'} size={16} className="mr-2" />
                  {autoRefresh ? 'Остановить' : 'Авто-обновление'}
                </Button>
                <Button onClick={fetchChanges} disabled={loading} size="sm">
                  <Icon name="RefreshCw" size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Обновить
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Поиск по ID, названию, стадии или имени пользователя..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchChanges();
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Изменения сделок ({filteredChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && changes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Icon name="Loader2" size={32} className="animate-spin mx-auto mb-2" />
                Загрузка данных...
              </div>
            ) : filteredChanges.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Icon name="FileX" size={48} className="mx-auto mb-2" />
                Нет данных для отображения
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">ID</TableHead>
                      <TableHead className="w-24">Сделка</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead className="w-48">Изменение</TableHead>
                      <TableHead className="w-40">Пользователь</TableHead>
                      <TableHead className="w-28">Сумма</TableHead>
                      <TableHead className="w-44">Время изменения</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChanges.map((change) => {
                      const dealData = change.deal_data || {};
                      return (
                        <TableRow key={change.id}>
                          <TableCell className="font-mono text-xs">{change.id}</TableCell>
                          <TableCell className="font-semibold">#{change.deal_id}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {dealData.TITLE || '—'}
                          </TableCell>
                          <TableCell>
                            {renderChangeSummary(change)}
                          </TableCell>
                          <TableCell>
                            {change.modifier_user_name ? (
                              <div className="flex items-center gap-2">
                                <Icon name="User" size={14} className="text-slate-400" />
                                <span className="text-sm">{change.modifier_user_name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {dealData.OPPORTUNITY && dealData.CURRENCY_ID
                              ? `${parseFloat(dealData.OPPORTUNITY).toLocaleString('ru-RU')} ${dealData.CURRENCY_ID}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDate(change.timestamp_received)}
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
      </div>
    </div>
  );
}