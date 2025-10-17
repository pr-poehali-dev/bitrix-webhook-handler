import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';

interface WebhookLog {
  id: number;
  webhook_type: string;
  inn: string;
  bitrix_company_id: string;
  request_body: string;
  response_status: string;
  duplicate_found: boolean;
  action_taken: string;
  created_at: string;
  source_info: string;
  request_method: string;
}

interface LogsTableProps {
  logs: WebhookLog[];
  loading: boolean;
  isClearing: boolean;
  restoringId: number | null;
  onLogSelect: (log: WebhookLog) => void;
  onClearLogs: () => void;
  onRestoreCompany: (log: WebhookLog) => void;
  formatDate: (dateStr: string) => string;
  getStatusBadge: (status: string, duplicate: boolean) => JSX.Element;
}

export default function LogsTable({
  logs,
  loading,
  isClearing,
  restoringId,
  onLogSelect,
  onClearLogs,
  onRestoreCompany,
  formatDate,
  getStatusBadge,
}: LogsTableProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon name="List" size={20} />
              Входящие запросы
            </CardTitle>
            <CardDescription>История обработки вебхуков из Битрикс24</CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={logs.length === 0 || isClearing}>
                <Icon name="Trash2" size={16} className="mr-2" />
                Очистить лог
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Подтвердите очистку</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие удалит все записи из журнала вебхуков. Данное действие необратимо.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={onClearLogs} className="bg-destructive hover:bg-destructive/90">
                  {isClearing ? 'Очистка...' : 'Удалить все записи'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
            <p>Нет записей в журнале</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Время (Екб)</TableHead>
                  <TableHead className="text-muted-foreground">Метод</TableHead>
                  <TableHead className="text-muted-foreground">Источник</TableHead>
                  <TableHead className="text-muted-foreground">ИНН</TableHead>
                  <TableHead className="text-muted-foreground">ID Компании</TableHead>
                  <TableHead className="text-muted-foreground">Статус</TableHead>
                  <TableHead className="text-muted-foreground">Действие</TableHead>
                  <TableHead className="text-muted-foreground w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const canRestore = log.duplicate_found && log.action_taken.includes('Auto-deleted');
                  
                  return (
                    <TableRow key={log.id} className="border-border">
                      <TableCell 
                        className="text-foreground font-mono text-sm cursor-pointer hover:bg-secondary/50"
                        onClick={() => onLogSelect(log)}
                      >
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => onLogSelect(log)}
                      >
                        <Badge variant={log.request_method === 'GET' ? 'outline' : 'secondary'} className="font-mono text-xs">
                          {log.request_method || 'POST'}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="text-muted-foreground text-xs max-w-[200px] truncate cursor-pointer hover:bg-secondary/50" 
                        title={log.source_info}
                        onClick={() => onLogSelect(log)}
                      >
                        {log.source_info || 'Unknown'}
                      </TableCell>
                      <TableCell 
                        className="font-semibold text-primary cursor-pointer hover:bg-secondary/50"
                        onClick={() => onLogSelect(log)}
                      >
                        {log.inn}
                      </TableCell>
                      <TableCell 
                        className="text-muted-foreground cursor-pointer hover:bg-secondary/50"
                        onClick={() => onLogSelect(log)}
                      >
                        {log.bitrix_company_id}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => onLogSelect(log)}
                      >
                        {getStatusBadge(log.response_status, log.duplicate_found)}
                      </TableCell>
                      <TableCell 
                        className="text-muted-foreground text-sm max-w-xs truncate cursor-pointer hover:bg-secondary/50"
                        onClick={() => onLogSelect(log)}
                      >
                        {log.action_taken}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canRestore && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRestoreCompany(log)}
                            disabled={restoringId === log.id}
                          >
                            <Icon name="Undo2" size={14} className="mr-1" />
                            {restoringId === log.id ? 'Восстановление...' : 'Отменить'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
