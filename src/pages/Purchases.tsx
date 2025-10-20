import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface Purchase {
  id: number;
  purchase_id: string;
  deal_id: string;
  title: string;
  status: string;
  products_count: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface Webhook {
  id: number;
  deal_id: string;
  company_id: string;
  webhook_type: string;
  products_count: number;
  total_amount: number;
  created_at: string;
  source_info: string;
}

export default function Purchases() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dealId, setDealId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingMonitor, setLoadingMonitor] = useState(true);

  useEffect(() => {
    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitorData = async () => {
    try {
      const [purchasesRes, webhooksRes] = await Promise.all([
        fetch(`${API_URL}?action=list_purchases`),
        fetch(`${API_URL}?action=list_webhooks`)
      ]);
      
      const purchasesData = await purchasesRes.json();
      const webhooksData = await webhooksRes.json();
      
      if (purchasesData.success) {
        setPurchases(purchasesData.purchases || []);
      }
      
      if (webhooksData.success) {
        setWebhooks(webhooksData.webhooks || []);
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error);
    } finally {
      setLoadingMonitor(false);
    }
  };

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
        fetchMonitorData();
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string; icon: string }> = {
      new: { variant: 'default', label: 'Новая', icon: 'Circle' },
      in_progress: { variant: 'secondary', label: 'В работе', icon: 'Clock' },
      completed: { variant: 'default', label: 'Завершена', icon: 'CheckCircle' },
      cancelled: { variant: 'destructive', label: 'Отменена', icon: 'XCircle' },
    };
    
    const config = statusMap[status] || { variant: 'secondary', label: status, icon: 'Circle' };
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon name={config.icon} size={12} />
        {config.label}
      </Badge>
    );
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

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-secondary">
            <TabsTrigger value="create" className="data-[state=active]:bg-primary">
              <Icon name="Plus" size={16} className="mr-2" />
              Создать закупку
            </TabsTrigger>
            <TabsTrigger value="monitor" className="data-[state=active]:bg-primary">
              <Icon name="BarChart3" size={16} className="mr-2" />
              Мониторинг ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary">
              <Icon name="Webhook" size={16} className="mr-2" />
              Журнал вебхуков ({webhooks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-6 space-y-6">
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
          </TabsContent>

          <TabsContent value="monitor" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Реестр закупок</CardTitle>
                <CardDescription>Все созданные закупки и их статусы</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMonitor ? (
                  <div className="flex items-center justify-center py-12">
                    <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Inbox" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Закупки пока не созданы</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID закупки</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>ID сделки</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Товаров</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                        <TableHead>Создана</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-mono text-xs">{purchase.purchase_id}</TableCell>
                          <TableCell className="font-medium">{purchase.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline">#{purchase.deal_id}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                          <TableCell className="text-right">{purchase.products_count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {Number(purchase.total_amount).toLocaleString('ru-RU')} ₽
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(purchase.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Журнал вебхуков</CardTitle>
                <CardDescription>Все входящие запросы от Битрикс24</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMonitor ? (
                  <div className="flex items-center justify-center py-12">
                    <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Inbox" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Вебхуки пока не поступали</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Тип</TableHead>
                        <TableHead>ID сделки</TableHead>
                        <TableHead className="text-right">Товаров</TableHead>
                        <TableHead className="text-right">Сумма</TableHead>
                        <TableHead>Источник</TableHead>
                        <TableHead>Время</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhooks.map((webhook) => (
                        <TableRow key={webhook.id}>
                          <TableCell>
                            <Badge variant="secondary">{webhook.webhook_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{webhook.deal_id}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{webhook.products_count}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {Number(webhook.total_amount).toLocaleString('ru-RU')} ₽
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                            {webhook.source_info}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(webhook.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
