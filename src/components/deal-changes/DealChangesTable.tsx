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
import { DealChange, STAGE_NAMES, formatDate, hasError } from './dealChangesUtils';

interface DealChangesTableProps {
  changes: DealChange[];
  loading: boolean;
  onRollback: (dealId: string, targetStage: string) => void;
  onShowHistory: (dealId: string) => void;
}

export default function DealChangesTable({
  changes,
  loading,
  onRollback,
  onShowHistory,
}: DealChangesTableProps) {
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

  const renderChangeSummary = (change: DealChange) => {
    if (change.changes_summary?.stage) {
      const { from, to } = change.changes_summary.stage;
      return (
        <div className="flex items-center gap-2">
          {getStageBadge(from)}
          <Icon name="ArrowRight" size={14} className="text-slate-400" />
          {getStageBadge(to)}
        </div>
      );
    }
    
    if (change.current_stage && !change.previous_stage) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs">Новая:</span>
          {getStageBadge(change.current_stage)}
        </div>
      );
    }
    
    return <span className="text-slate-400 text-xs">—</span>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Изменения сделок ({changes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && changes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={48} className="animate-spin text-slate-400" />
          </div>
        ) : changes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Icon name="Inbox" size={64} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">Нет данных</p>
            <p className="text-sm">Изменения сделок появятся здесь</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead className="w-24">Сделка</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead className="w-48">Изменение</TableHead>
                  <TableHead className="w-40">Пользователь</TableHead>
                  <TableHead className="w-28">Сумма</TableHead>
                  <TableHead className="w-44">Время изменения</TableHead>
                  <TableHead className="w-32">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((change) => {
                  const dealData = change.deal_data || {};
                  const isError = hasError(change);
                  return (
                    <TableRow key={change.id} className={isError ? 'bg-red-50' : ''}>
                      <TableCell className="font-mono text-xs">{change.id}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          #{change.deal_id}
                          {isError && (
                            <Icon name="AlertCircle" size={14} className="text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {isError ? (
                          <div className="text-red-600 text-sm">
                            <strong>Ошибка:</strong> {dealData.error || 'Некорректные данные'}
                          </div>
                        ) : (
                          dealData.TITLE || '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {renderChangeSummary(change)}
                      </TableCell>
                      <TableCell>
                        {change.modifier_user_name ? (
                          <div className="flex items-center gap-2">
                            <Icon name="User" size={14} className="text-slate-400" />
                            <span className="text-sm">{change.modifier_user_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {dealData.OPPORTUNITY && dealData.CURRENCY_ID
                          ? `${parseFloat(dealData.OPPORTUNITY).toLocaleString('ru-RU')} ${dealData.CURRENCY_ID}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {formatDate(change.timestamp_received)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {change.previous_stage && !isError && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRollback(change.deal_id, change.previous_stage!)}
                            >
                              <Icon name="Undo2" size={14} className="mr-1" />
                              Откатить
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onShowHistory(change.deal_id)}
                          >
                            <Icon name="History" size={14} className="mr-1" />
                            История
                          </Button>
                        </div>
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
