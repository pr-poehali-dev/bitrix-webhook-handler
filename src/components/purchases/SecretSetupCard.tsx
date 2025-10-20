import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SecretSetupCard() {
  const [webhookUrl] = useState('https://itpood.ru/rest/1/i9y7cd0wvqhhmyl8/');
  const [smartProcessId, setSmartProcessId] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-900">
          <Icon name="Lock" size={24} />
          Сохранение секретов проекта
        </CardTitle>
        <CardDescription className="text-indigo-700">
          Для работы интеграции нужно сохранить URL вебхука и ID смарт-процесса в секретах
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <Alert className="bg-green-50 border-green-300">
          <Icon name="CheckCircle2" className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>URL вебхука уже сохранён!</strong> Ваш URL: <code className="bg-green-100 px-1 rounded">{webhookUrl}</code>
          </AlertDescription>
        </Alert>

        <div className="bg-white rounded-lg p-4 border border-indigo-200 space-y-4">
          <div>
            <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <Icon name="Database" size={18} />
              Секреты уже созданы в проекте
            </h3>
            
            <div className="space-y-3">
              <div className="bg-indigo-50 p-3 rounded border border-indigo-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Label className="text-indigo-900 font-mono text-sm">BITRIX24_WEBHOOK_URL</Label>
                    <p className="text-xs text-indigo-700 mt-1">Входящий вебхук Битрикс24</p>
                    <code className="block mt-2 bg-white p-2 rounded text-xs break-all text-indigo-900 border border-indigo-200">
                      {webhookUrl}
                    </code>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyWebhookUrl}
                    className="flex-shrink-0"
                  >
                    <Icon name={copiedWebhook ? "Check" : "Copy"} size={14} />
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <Label className="text-amber-900 font-mono text-sm">SMART_PROCESS_PURCHASES_ID</Label>
                <p className="text-xs text-amber-700 mt-1 mb-3">
                  ID смарт-процесса "Обеспечение" (нужно узнать из Битрикс24)
                </p>
                
                <div className="bg-white rounded p-3 border border-amber-300 mb-3">
                  <p className="text-sm text-amber-900 font-semibold mb-2">Как узнать ID смарт-процесса:</p>
                  <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                    <li>Откройте <strong>Настройки CRM → Смарт-процессы</strong></li>
                    <li>Найдите и откройте смарт-процесс <strong>"Обеспечение"</strong></li>
                    <li>В адресной строке найдите число после <code className="bg-amber-100 px-1">entityTypeId=</code></li>
                    <li>Например: <code className="bg-amber-100 px-1">entityTypeId=128</code> → ID = <strong>128</strong></li>
                  </ol>
                </div>

                <Input
                  type="text"
                  placeholder="Введите ID, например: 128"
                  value={smartProcessId}
                  onChange={(e) => setSmartProcessId(e.target.value)}
                  className="border-amber-300"
                />
                
                {smartProcessId && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                    <Icon name="Info" size={14} className="inline mr-1" />
                    Сохраните это значение в секретах проекта через настройки
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <Icon name="Info" size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Где найти секреты проекта:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Откройте настройки проекта в poehali.dev</li>
                <li>Перейдите в раздел "Секреты"</li>
                <li>Найдите секреты <code className="bg-blue-100 px-1 rounded">BITRIX24_WEBHOOK_URL</code> и <code className="bg-blue-100 px-1 rounded">SMART_PROCESS_PURCHASES_ID</code></li>
                <li>Вставьте соответствующие значения</li>
              </ol>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
