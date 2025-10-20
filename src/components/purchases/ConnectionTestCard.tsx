import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface ConnectionTestCardProps {
  apiUrl: string;
}

export default function ConnectionTestCard({ apiUrl }: ConnectionTestCardProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{
    webhookConfigured: boolean;
    smartProcessConfigured: boolean;
    databaseConnected: boolean;
    error?: string;
  } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}?action=test_connection`);
      const data = await response.json();

      if (data.success) {
        setResult({
          webhookConfigured: !data.error?.includes('BITRIX24_WEBHOOK_URL'),
          smartProcessConfigured: !data.error?.includes('SMART_PROCESS_PURCHASES_ID'),
          databaseConnected: true,
        });
      } else {
        setResult({
          webhookConfigured: !data.error?.includes('BITRIX24_WEBHOOK_URL'),
          smartProcessConfigured: !data.error?.includes('SMART_PROCESS_PURCHASES_ID'),
          databaseConnected: false,
          error: data.error,
        });
      }
    } catch (error) {
      setResult({
        webhookConfigured: false,
        smartProcessConfigured: false,
        databaseConnected: false,
        error: String(error),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Activity" size={20} />
          Проверка подключения
        </CardTitle>
        <CardDescription>
          Проверьте готовность системы к работе
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={testing}
          className="w-full"
          variant="outline"
        >
          {testing ? (
            <>
              <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
              Проверка...
            </>
          ) : (
            <>
              <Icon name="Play" size={16} className="mr-2" />
              Запустить проверку
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm">URL вебхука Битрикс24:</span>
              {result.webhookConfigured ? (
                <Badge className="bg-green-500 text-white gap-1">
                  <Icon name="CheckCircle2" size={12} />
                  Настроен
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <Icon name="XCircle" size={12} />
                  Не настроен
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">ID смарт-процесса:</span>
              {result.smartProcessConfigured ? (
                <Badge className="bg-green-500 text-white gap-1">
                  <Icon name="CheckCircle2" size={12} />
                  Настроен
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <Icon name="XCircle" size={12} />
                  Не настроен
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm">Подключение к БД:</span>
              {result.databaseConnected ? (
                <Badge className="bg-green-500 text-white gap-1">
                  <Icon name="CheckCircle2" size={12} />
                  Работает
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <Icon name="XCircle" size={12} />
                  Ошибка
                </Badge>
              )}
            </div>

            {result.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                <strong>Ошибка:</strong> {result.error}
              </div>
            )}

            {result.webhookConfigured && result.smartProcessConfigured && result.databaseConnected && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800 font-medium">
                ✅ Все настроено! Система готова к работе
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
