import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import StatsCards from '@/components/StatsCards';
import LogsTable from '@/components/LogsTable';
import ApiDocumentation from '@/components/ApiDocumentation';
import LogDetailsDialog from '@/components/LogDetailsDialog';
import DiagnosticTools from '@/components/DiagnosticTools';
import LoginForm from '@/components/LoginForm';

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
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const authToken = localStorage.getItem('webhook_auth_token');
    if (authToken) {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handleLogin = async (username: string, password: string) => {
    setAuthLoading(true);
    setAuthError('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username,
          password,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('webhook_auth_token', data.token);
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Неверный логин или пароль');
      }
    } catch (error) {
      setAuthError('Ошибка подключения к серверу');
      console.error('Login error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('webhook_auth_token');
    setIsAuthenticated(false);
  };

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

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={authError} loading={authLoading} />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon name="Webhook" size={32} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Битрикс24 Webhook Monitor</h1>
              <p className="text-muted-foreground">Мониторинг вебхуков и проверка дубликатов ИНН</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <Icon name="LogOut" size={16} className="mr-2" />
            Выход
          </Button>
        </div>

        <StatsCards stats={stats} />

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-secondary">
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary">
              <Icon name="FileText" size={16} className="mr-2" />
              Журнал вебхуков
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="data-[state=active]:bg-primary">
              <Icon name="Wrench" size={16} className="mr-2" />
              Диагностика
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-primary">
              <Icon name="Code" size={16} className="mr-2" />
              API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="mt-6">
            <LogsTable
              logs={logs}
              loading={loading}
              isClearing={isClearing}
              restoringId={restoringId}
              onLogSelect={setSelectedLog}
              onClearLogs={clearLogs}
              onRestoreCompany={restoreCompany}
              formatDate={formatDate}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="diagnostic" className="mt-6">
            <DiagnosticTools apiUrl={API_URL} />
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <ApiDocumentation apiUrl={API_URL} />
          </TabsContent>
        </Tabs>
      </div>

      <LogDetailsDialog
        selectedLog={selectedLog}
        onClose={() => setSelectedLog(null)}
        formatDate={formatDate}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
}