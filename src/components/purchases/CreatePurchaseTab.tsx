import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Product } from './types';
import HelpDialog from './HelpDialog';
import ConnectionTestCard from './ConnectionTestCard';

interface CreatePurchaseTabProps {
  apiUrl: string;
  onPurchaseCreated: () => void;
  onShowToast: (title: string, description: string, variant?: 'default' | 'destructive') => void;
}

export default function CreatePurchaseTab({ apiUrl, onPurchaseCreated, onShowToast }: CreatePurchaseTabProps) {
  const [dealId, setDealId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchProducts = async () => {
    if (!dealId.trim()) {
      onShowToast('Ошибка', 'Введите ID сделки', 'destructive');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}?deal_id=${dealId}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        onShowToast('Успешно', `Загружено товаров: ${data.total_items}`);
      } else {
        const errorMsg = data.error || 'Не удалось загрузить товары';
        
        if (errorMsg.includes('BITRIX24_WEBHOOK_URL') || errorMsg.includes('not configured')) {
          onShowToast('Настройте секреты', 'Сначала укажите URL вебхука Битрикс24 в секретах проекта (см. инструкцию по кнопке ?)', 'destructive');
        } else if (errorMsg.includes('Bitrix24 API error')) {
          onShowToast('Ошибка Битрикс24', 'Проверьте ID сделки и права вебхука в Битрикс24', 'destructive');
        } else {
          onShowToast('Ошибка', errorMsg, 'destructive');
        }
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      onShowToast('Ошибка', 'Ошибка подключения к серверу', 'destructive');
    } finally {
      setLoading(false);
    }
  };

  const createPurchase = async () => {
    if (!dealId.trim()) {
      onShowToast('Ошибка', 'Введите ID сделки', 'destructive');
      return;
    }

    if (products.length === 0) {
      onShowToast('Ошибка', 'Сначала загрузите товары по сделке', 'destructive');
      return;
    }

    setCreating(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_purchase',
          deal_id: dealId,
          products: products,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch (e) {
        const responseText = await response.text();
        console.error('Failed to parse response as JSON:', responseText);
        onShowToast('Ошибка сервера', `HTTP ${response.status}: ${responseText.substring(0, 200)}`, 'destructive');
        return;
      }

      console.log('Create purchase response:', data);

      if (data.success) {
        onShowToast('✅ Закупка создана', `ID закупки: ${data.purchase_id}`);
        setProducts([]);
        setDealId('');
        onPurchaseCreated();
      } else {
        const errorMsg = data.error || 'Не удалось создать закупку';
        
        console.error('Purchase creation error:', errorMsg);
        
        if (errorMsg.includes('BITRIX24_WEBHOOK_URL') || errorMsg.includes('not configured')) {
          onShowToast('Настройте секреты', 'Необходимо указать URL вебхука Битрикс24 в настройках проекта', 'destructive');
        } else if (errorMsg.includes('SMART_PROCESS_PURCHASES_ID')) {
          onShowToast('Настройте секреты', 'Необходимо указать ID смарт-процесса в настройках проекта', 'destructive');
        } else {
          onShowToast('Ошибка Битрикс24', errorMsg, 'destructive');
        }
      }
    } catch (error) {
      console.error('Error creating purchase:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        onShowToast('Таймаут', 'Запрос занял слишком много времени. Проверьте настройки Битрикс24 или повторите позже.', 'destructive');
      } else {
        onShowToast('Ошибка', 'Ошибка подключения к серверу. Проверьте консоль браузера для деталей.', 'destructive');
      }
    } finally {
      setCreating(false);
    }
  };

  const totalSum = products.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon name="Info" size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-semibold mb-1">
              Перед началом работы настройте интеграцию
            </p>
            <p className="text-xs text-blue-800">
              Нажмите на кнопку <strong>?</strong> справа и следуйте инструкциям для настройки секретов и прав Битрикс24
            </p>
          </div>
          <HelpDialog apiUrl={apiUrl} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Получить товары по сделке</CardTitle>
          <CardDescription>
            Введите ID сделки из Битрикс24, чтобы загрузить список товаров
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="dealId">ID сделки</Label>
              <Input
                id="dealId"
                type="text"
                placeholder="Например: 12345"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={fetchProducts} disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={16} className="mr-2" />
                    Загрузить товары
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {products.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Товары сделки #{dealId}</CardTitle>
                <CardDescription>
                  Всего позиций: {products.length} | Сумма: {totalSum.toLocaleString('ru-RU')} ₽
                </CardDescription>
              </div>
              <Button onClick={createPurchase} disabled={creating} size="lg">
                {creating ? (
                  <>
                    <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <Icon name="Plus" size={18} className="mr-2" />
                    Создать закупку в ЦРМ
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead className="text-right">Количество</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground">ID: {product.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {product.quantity} {product.measure}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {product.price.toLocaleString('ru-RU')} ₽
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {product.total.toLocaleString('ru-RU')} ₽
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="text-right font-bold">
                    Итого:
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">
                    {totalSum.toLocaleString('ru-RU')} ₽
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ConnectionTestCard apiUrl={apiUrl} />
    </div>
  );
}