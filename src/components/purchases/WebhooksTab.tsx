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

  const getResponseBadge = (webhook: Webhook) => {
    if (webhook.purchase_created) {
      return (
        <Badge className="bg-green-500 text-white gap-1">
          <Icon name="CheckCircle2" size={12} />
          Закупка создана
        </Badge>
      );
    }
    
    if (webhook.response_status === 'error') {
      return (
        <Badge variant="destructive" className="gap-1">
          <Icon name="XCircle" size={12} />
          Ошибка
        </Badge>
      );
    }
    
    if (webhook.response_status === 'success') {
      return (
        <Badge className="bg-blue-500 text-white gap-1">
          <Icon name="Info" size={12} />
          Обработан
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Icon name="Clock" size={12} />
        Ожидает
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Журнал вебхуков</CardTitle>
        <CardDescription>Все входящие запросы от Битрикс24 и результаты их обработки</CardDescription>
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
                <TableHead>Результат</TableHead>
                <TableHead>Сообщение</TableHead>
                <TableHead className="text-right">Товаров</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
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
                  <TableCell>
                    {getResponseBadge(webhook)}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="flex flex-col gap-1">
                      {webhook.response_message && (
                        <span className="text-xs text-foreground">
                          {webhook.response_message}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">
                        {webhook.source_info}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{webhook.products_count || 0}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {webhook.total_amount ? Number(webhook.total_amount).toLocaleString('ru-RU') + ' ₽' : '—'}
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