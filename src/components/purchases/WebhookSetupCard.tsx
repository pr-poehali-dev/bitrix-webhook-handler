import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface WebhookSetupCardProps {
  apiUrl: string;
}

export default function WebhookSetupCard({ apiUrl }: WebhookSetupCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Icon name="Webhook" size={24} />
          Автоматический вебхук из Битрикс24
        </CardTitle>
        <CardDescription className="text-purple-700">
          Настройте автоматическое создание закупок при изменении сделок
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900">URL для вебхука:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="gap-2"
            >
              <Icon name={copied ? "Check" : "Copy"} size={14} />
              {copied ? "Скопировано" : "Копировать"}
            </Button>
          </div>
          <code className="block bg-purple-50 px-3 py-2 rounded text-xs font-mono break-all text-purple-900">
            {apiUrl}
          </code>
        </div>

        <div className="space-y-3 text-sm text-purple-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <p className="font-semibold">Откройте настройки Битрикс24</p>
              <p className="text-purple-700">Перейдите: <span className="font-mono bg-purple-100 px-1 rounded">Настройки → Настройки CRM → Вебхуки</span></p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <p className="font-semibold">Создайте входящий вебхук</p>
              <p className="text-purple-700">Нажмите "Добавить вебхук" и выберите "Входящий вебхук"</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <p className="font-semibold">Настройте триггер</p>
              <ul className="list-disc list-inside text-purple-700 mt-1 space-y-1">
                <li>Событие: <span className="font-mono bg-purple-100 px-1 rounded">OnCrmDealUpdate</span></li>
                <li>URL-адрес: вставьте скопированный URL выше</li>
                <li>Метод: <span className="font-mono bg-purple-100 px-1 rounded">POST</span></li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <p className="font-semibold">Настройте параметры запроса</p>
              <p className="text-purple-700 mt-1">В теле запроса добавьте:</p>
              <pre className="bg-purple-900 text-purple-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`{
  "deal_id": "{{ID}}",
  "event": "{{EVENT}}",
  "timestamp": "{{TIMESTAMP}}"
}`}
              </pre>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-xs">
              ✓
            </div>
            <div>
              <p className="font-semibold">Сохраните и проверьте</p>
              <p className="text-purple-700">Измените любую сделку в Битрикс24 — закупка создастся автоматически</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex gap-2">
            <Icon name="Info" size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Что будет происходить:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>При каждом изменении сделки Битрикс24 отправит вебхук</li>
                <li>Система загрузит товары из сделки</li>
                <li>Автоматически создаст закупку в ЦРМ "Обеспечение"</li>
                <li>Все операции будут видны во вкладке "Журнал вебхуков"</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex gap-2">
            <Icon name="AlertTriangle" size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">Важно:</p>
              <p>Убедитесь, что у входящего вебхука есть права на чтение сделок и создание смарт-процессов</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
