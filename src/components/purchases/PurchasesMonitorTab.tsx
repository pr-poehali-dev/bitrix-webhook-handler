import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Purchase, MonthlyStats, Product } from './types';
import PurchaseAnalytics from './PurchaseAnalytics';

interface PurchasesMonitorTabProps {
  purchases: Purchase[];
  loading: boolean;
  stats: MonthlyStats | null;
}

export default function PurchasesMonitorTab({ purchases, loading, stats }: PurchasesMonitorTabProps) {
  const [expandedPurchases, setExpandedPurchases] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedPurchases);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedPurchases(newSet);
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

  return (
    <div className="space-y-6">
      <PurchaseAnalytics stats={stats} />
      
      <Card>
        <CardHeader>
          <CardTitle>Реестр закупок</CardTitle>
          <CardDescription>Все созданные закупки и их статусы</CardDescription>
        </CardHeader>
        <CardContent>
        {loading ? (
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
              {purchases.map((purchase) => {
                const isExpanded = expandedPurchases.has(purchase.id);
                let products: Product[] = [];
                
                try {
                  products = purchase.products_data 
                    ? JSON.parse(purchase.products_data) 
                    : [];
                } catch (e) {
                  console.error('Error parsing products_data:', e, purchase.products_data);
                }
                
                return (
                  <>
                    <TableRow key={purchase.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpanded(purchase.id)}>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <Icon 
                            name={isExpanded ? "ChevronDown" : "ChevronRight"} 
                            size={16} 
                            className="text-muted-foreground"
                          />
                          {purchase.purchase_id}
                        </div>
                      </TableCell>
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
                    
                    {isExpanded && products.length > 0 && (
                      <TableRow key={`${purchase.id}-details`}>
                        <TableCell colSpan={7} className="bg-muted/30 p-4">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Icon name="Package" size={16} />
                              Товары в закупке:
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Наименование</TableHead>
                                  <TableHead className="text-right">Кол-во</TableHead>
                                  <TableHead className="text-right">Цена</TableHead>
                                  <TableHead className="text-right">Сумма</TableHead>
                                  <TableHead>Тип</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {products.map((product, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-right">{product.quantity} {product.measure || 'шт'}</TableCell>
                                    <TableCell className="text-right">{product.price.toLocaleString('ru-RU')} ₽</TableCell>
                                    <TableCell className="text-right font-semibold">{product.total.toLocaleString('ru-RU')} ₽</TableCell>
                                    <TableCell>
                                      <Badge variant={product.isService ? "secondary" : "outline"}>
                                        {product.isService ? 'Услуга' : 'Товар'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </div>
  );
}