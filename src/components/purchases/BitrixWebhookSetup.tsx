import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';

export default function BitrixWebhookSetup() {
  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <Icon name="Key" size={24} />
          Настройка входящего вебхука Битрикс24
        </CardTitle>
        <CardDescription className="text-green-700">
          Права и методы API, которые необходимо предоставить вебхуку
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Как создать вебхук */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Icon name="Settings" size={18} />
            1. Создание входящего вебхука
          </h3>
          <ol className="space-y-2 text-sm text-green-800">
            <li className="flex items-start gap-2">
              <span className="font-mono bg-green-100 px-2 py-0.5 rounded text-xs flex-shrink-0">1</span>
              <span>Откройте <strong>Настройки → Разработчикам → Другое → Входящий вебхук</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono bg-green-100 px-2 py-0.5 rounded text-xs flex-shrink-0">2</span>
              <span>Нажмите <strong>"Создать вебхук"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono bg-green-100 px-2 py-0.5 rounded text-xs flex-shrink-0">3</span>
              <span>Укажите название: <strong>"Интеграция закупок"</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono bg-green-100 px-2 py-0.5 rounded text-xs flex-shrink-0">4</span>
              <span>Выберите права доступа (см. ниже)</span>
            </li>
          </ol>
        </div>

        <Separator />

        {/* Необходимые права */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Icon name="Shield" size={18} />
            2. Необходимые права доступа (Permissions)
          </h3>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Icon name="CheckCircle2" size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-600 text-white">Достаточно одного права!</Badge>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200 mb-2">
                  <code className="text-lg font-bold text-blue-900">CRM</code>
                </div>
                <p className="text-sm text-blue-900 font-medium mb-2">
                  ✅ Это право даёт доступ ко всем необходимым методам:
                </p>
                <ul className="space-y-1 text-sm text-blue-800 ml-4">
                  <li>• Чтение информации о сделках</li>
                  <li>• Получение списка товаров</li>
                  <li>• Создание элементов смарт-процессов</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3">
            <div className="flex gap-2 text-sm text-amber-900">
              <Icon name="Info" size={16} className="flex-shrink-0 mt-0.5" />
              <p>
                <strong>Важно:</strong> В Битрикс24 при создании входящего вебхука просто отметьте галочкой <strong>"CRM"</strong> в списке прав. 
                Не нужно выбирать отдельные методы — все необходимые методы API будут доступны автоматически.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Используемые методы API */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Icon name="Code" size={18} />
            3. Используемые методы Битрикс24 API
          </h3>
          
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="flex items-start gap-2">
                <Icon name="FileText" size={16} className="text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <code className="text-sm font-mono text-blue-900">crm.deal.get</code>
                  <p className="text-xs text-blue-700 mt-1">Получение информации о сделке (название, сумма, статус)</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <div className="flex items-start gap-2">
                <Icon name="ShoppingCart" size={16} className="text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <code className="text-sm font-mono text-purple-900">crm.deal.productrows.get</code>
                  <p className="text-xs text-purple-700 mt-1">Загрузка списка товаров из сделки (название, количество, цена)</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded border border-green-200">
              <div className="flex items-start gap-2">
                <Icon name="Plus" size={16} className="text-green-600 mt-0.5" />
                <div className="flex-1">
                  <code className="text-sm font-mono text-green-900">crm.item.add</code>
                  <p className="text-xs text-green-700 mt-1">Создание элемента в смарт-процессе "Обеспечение" (закупка)</p>
                  <p className="text-xs text-green-600 mt-1 italic">entityTypeId вашего смарт-процесса нужно указать в настройках</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Проверка вебхука */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Icon name="AlertCircle" size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 space-y-2">
              <p className="font-semibold">Как проверить, что вебхук настроен правильно:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Скопируйте URL вебхука после создания</li>
                <li>Сохраните его в безопасном месте (он содержит ключ доступа)</li>
                <li>Используйте этот URL в коде интеграции</li>
                <li>Проверьте работу через вкладку "Журнал вебхуков"</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Пример URL */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-green-900 mb-2">Пример URL входящего вебхука:</h4>
          <code className="block bg-green-900 text-green-100 p-3 rounded text-xs break-all">
            https://ваш-домен.bitrix24.ru/rest/1/ключ_доступа/
          </code>
          <p className="text-xs text-green-700 mt-2">
            ⚠️ Храните URL вебхука в секрете — он даёт полный доступ к вашему Битрикс24
          </p>
        </div>

        {/* Дополнительные рекомендации */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <Icon name="Lightbulb" size={18} />
            Рекомендации
          </h3>
          <ul className="space-y-2 text-sm text-green-800">
            <li className="flex items-start gap-2">
              <Icon name="Check" size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <span>Создайте отдельный вебхук для каждой интеграции</span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Check" size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <span>Не давайте лишних прав — только те, что указаны выше</span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Check" size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <span>Периодически обновляйте ключи доступа для безопасности</span>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="Check" size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <span>Используйте секреты проекта для хранения URL вебхука</span>
            </li>
          </ul>
        </div>

      </CardContent>
    </Card>
  );
}