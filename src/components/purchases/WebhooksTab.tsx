import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Webhook } from './types';

interface WebhooksTabProps {
  webhooks: Webhook[];
  loading: boolean;
}

export default function WebhooksTab({ webhooks, loading }: WebhooksTabProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Журнал вебхуков</CardTitle>
        <CardDescription>Все входящие запросы от Битрикс24</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
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
  );
}
