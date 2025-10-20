import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Purchase } from './types';

interface PurchasesMonitorTabProps {
  purchases: Purchase[];
  loading: boolean;
}

export default function PurchasesMonitorTab({ purchases, loading }: PurchasesMonitorTabProps) {
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
  );
}
