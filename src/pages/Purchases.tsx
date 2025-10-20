import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const API_URL = 'https://functions.poehali.dev/f7d622c6-5381-482f-a6e4-a8709c2ff2e4';

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  measure: string;
}

export default function Purchases() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dealId, setDealId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchProducts = async () => {
    if (!dealId.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите ID сделки',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?deal_id=${dealId}`);
      const data = await response.json();

      if (data.success) {
        setProducts(data.products || []);
        toast({
          title: 'Успешно',
          description: `Загружено товаров: ${data.total_items}`,
        });
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось загрузить товары',
          variant: 'destructive',
        });
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: 'Ошибка',
        description: 'Ошибка подключения к серверу',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createPurchase = async () => {
    if (!dealId.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите ID сделки',
        variant: 'destructive',
      });
      return;
    }

    if (products.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Сначала загрузите товары по сделке',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_purchase',
          deal_id: dealId,
          products: products,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '✅ Закупка создана',
          description: `ID закупки: ${data.purchase_id}`,
        });
        setProducts([]);
        setDealId('');
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать закупку',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast({
        title: 'Ошибка',
        description: 'Ошибка подключения к серверу',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const totalSum = products.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Icon name="ShoppingCart" size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Закупки</h1>
              <p className="text-muted-foreground">Создание закупок в ЦРМ "Обеспечение" из сделок Битрикс24</p>
            </div>
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

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Icon name="Info" size={20} />
              Как это работает
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p><strong>1. Вебхук из Битрикс24:</strong> При создании сделки отправляется вебхук с ID сделки на этот API</p>
            <p><strong>2. Получение товаров:</strong> Система загружает список товаров через crm.deal.productrows.get</p>
            <p><strong>3. Создание закупки:</strong> Товары отправляются в смарт-процесс "Обеспечение" в Битрикс24</p>
            <p className="pt-2 border-t border-blue-200">
              <strong>URL для вебхука:</strong>{' '}
              <code className="bg-blue-100 px-2 py-1 rounded text-xs">{API_URL}</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
