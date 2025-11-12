import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const WEBHOOK_URL = 'https://functions.poehali.dev/6a844be4-d079-4584-aa51-27ed6b95cb81';

export default function WebhookTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testWebhook = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const testData = {
        bitrix_id: '114',
        test: true,
        auth: 'mzaa1j1d6pbzszbeu6g2awhv59v4hy2z'
      };
      
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestClient/1.0'
        },
        body: JSON.stringify(testData),
      });
      
      const data = await response.json();
      setResult({ 
        status: response.status, 
        data,
        sent: testData,
        timestamp: new Date().toISOString()
      });
      
      if (response.ok) {
        toast({
          title: 'Вебхук работает!',
          description: 'Соединение с бэкендом успешно',
        });
      } else {
        throw new Error('Ошибка вебхука');
      }
    } catch (err: any) {
      toast({
        title: 'Ошибка',
        description: err.message || 'Не удалось подключиться к вебхуку',
        variant: 'destructive',
      });
      setResult({ error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Проверка Вебхука</h1>
            <p className="text-slate-600 mt-2">Тестирование подключения к Битрикс24</p>
          </div>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            На главную
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>URL Вебхука</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-100 p-4 rounded-lg font-mono text-sm break-all">
              {WEBHOOK_URL}
            </div>
            <div className="mt-4">
              <Button onClick={testWebhook} disabled={testing}>
                <Icon name={testing ? 'Loader2' : 'Zap'} size={16} className={`mr-2 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Проверка...' : 'Проверить подключение'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Результат</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Настройка в Битрикс24</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Шаг 1: Бизнес-процессы</h3>
              <p className="text-slate-600">
                Перейдите в <strong>CRM → Настройки → Бизнес-процессы</strong>
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Шаг 2: Триггеры</h3>
              <p className="text-slate-600">
                Создайте триггер на событие <strong>"Добавление компании"</strong> (ONCRMCOMPANYADD)
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Шаг 3: Действие "Вебхук"</h3>
              <p className="text-slate-600">
                Добавьте действие "Вебхук" с URL:
              </p>
              <div className="bg-slate-100 p-3 rounded font-mono text-sm break-all">
                {WEBHOOK_URL}
              </div>
              <p className="text-slate-600 text-sm">
                Тело запроса: <code className="bg-slate-200 px-2 py-1 rounded">{'{"bitrix_id": "{=Document:ID}"}'}</code>
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Шаг 4: Активируйте</h3>
              <p className="text-slate-600">
                Сохраните и активируйте бизнес-процесс
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}