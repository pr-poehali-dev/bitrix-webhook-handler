import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import DealChangesFilters from '@/components/deal-changes/DealChangesFilters';
import DealChangesTable from '@/components/deal-changes/DealChangesTable';
import DealHistoryModal from '@/components/deal-changes/DealHistoryModal';
import {
  DealChange,
  RollbackLog,
  BACKEND_URL,
  ENRICH_URL,
  ROLLBACK_URL,
  HISTORY_URL,
  STAGE_NAMES,
} from '@/components/deal-changes/dealChangesUtils';

export default function DealChanges() {
  const [changes, setChanges] = useState<DealChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [historyDealId, setHistoryDealId] = useState<string | null>(null);
  const [historyLogs, setHistoryLogs] = useState<RollbackLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  const enrichUserData = async () => {
    setEnriching(true);
    try {
      const response = await fetch(ENRICH_URL, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Ошибка обогащения данных');
      }

      const data = await response.json();
      
      toast({
        title: 'Успешно!',
        description: `${data.message}. Обработано пользователей: ${data.users_processed}`,
      });
      
      fetchChanges();
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message || 'Не удалось обогатить данные',
        variant: 'destructive',
      });
    } finally {
      setEnriching(false);
    }
  };

  const rollbackDeal = async (dealId: string, targetStage: string) => {
    if (!confirm(`Откатить сделку #${dealId} на стадию ${STAGE_NAMES[targetStage] || targetStage}?`)) {
      return;
    }

    try {
      const response = await fetch(ROLLBACK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deal_id: dealId,
          target_stage_id: targetStage,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Готово!',
          description: data.message,
        });
        fetchChanges();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast({
        title: 'Ошибка отката',
        description: err.message || 'Не удалось откатить сделку',
        variant: 'destructive',
      });
    }
  };

  const fetchDealHistory = async (dealId: string) => {
    setHistoryDealId(dealId);
    setHistoryLoading(true);
    try {
      const response = await fetch(`${HISTORY_URL}?deal_id=${dealId}&limit=50`);
      if (!response.ok) {
        throw new Error('Ошибка загрузки истории');
      }
      const data = await response.json();
      setHistoryLogs(data.logs || []);
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message || 'Не удалось загрузить историю действий',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryDealId(null);
    setHistoryLogs([]);
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

        <DealChangesFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={fetchChanges}
          enriching={enriching}
          onEnrich={enrichUserData}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          loading={loading}
          onRefresh={fetchChanges}
        />

        <DealChangesTable
          changes={filteredChanges}
          loading={loading}
          onRollback={rollbackDeal}
          onShowHistory={fetchDealHistory}
        />

        <DealHistoryModal
          dealId={historyDealId}
          logs={historyLogs}
          loading={historyLoading}
          onClose={closeHistory}
        />
      </div>
    </div>
  );
}
