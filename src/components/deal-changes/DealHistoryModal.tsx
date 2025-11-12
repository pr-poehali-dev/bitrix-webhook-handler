import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RollbackLog, STAGE_NAMES, formatDate } from './dealChangesUtils';

interface DealHistoryModalProps {
  dealId: string | null;
  logs: RollbackLog[];
  loading: boolean;
  onClose: () => void;
}

export default function DealHistoryModal({
  dealId,
  logs,
  loading,
  onClose,
}: DealHistoryModalProps) {
  if (!dealId) return null;

  const getStageBadge = (stageId: string) => {
    const stageName = STAGE_NAMES[stageId] || stageId;
    const variants: Record<string, any> = {
      'NEW': 'default',
      'PREPARATION': 'secondary',
      'CLIENT': 'outline',
      'EXECUTING': 'default',
      'FINAL_INVOICE': 'secondary',
      'WON': 'default',
      'LOSE': 'destructive',
    };
    
    return (
      <Badge variant={variants[stageId] || 'outline'}>
        {stageName}
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>История действий для сделки #{dealId}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon name="X" size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={32} className="animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Icon name="FileText" size={48} className="mx-auto mb-2 text-slate-300" />
            <p>Нет истории действий для этой сделки</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-32">Тип</TableHead>
                <TableHead className="w-40">Изменение</TableHead>
                <TableHead className="w-32">Кто</TableHead>
                <TableHead>Причина</TableHead>
                <TableHead className="w-32">Статус</TableHead>
                <TableHead className="w-44">Время</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className={!log.success ? 'bg-red-50' : ''}>
                  <TableCell className="font-mono text-xs">{log.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {log.action_type === 'rollback' ? 'Откат' : log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.previous_stage && log.new_stage ? (
                      <div className="flex items-center gap-1 text-xs">
                        {getStageBadge(log.previous_stage)}
                        <Icon name="ArrowRight" size={12} />
                        {getStageBadge(log.new_stage)}
                      </div>
                    ) : (
                      <span className="text-xs">→ {getStageBadge(log.new_stage)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{log.performed_by}</TableCell>
                  <TableCell className="text-xs text-slate-600">{log.reason}</TableCell>
                  <TableCell>
                    {log.success ? (
                      <Badge variant="default" className="bg-green-500">
                        <Icon name="CheckCircle" size={12} className="mr-1" />
                        Успешно
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <Icon name="XCircle" size={12} className="mr-1" />
                        Ошибка
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {formatDate(log.performed_at)}
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
