import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { BpLog } from './types';
import { getStatusBadge, formatDate } from './utils.tsx';

interface BpLogsListProps {
  logs: BpLog[];
  loading: boolean;
  onViewDetails: (bpId: string) => void;
}

const BpLogsList = ({ logs, loading, onViewDetails }: BpLogsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Лента бизнес-процессов</CardTitle>
        <CardDescription>
          Найдено записей: {logs.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500">
            <Icon name="FileQuestion" size={48} className="mx-auto mb-4 opacity-50" />
            <p>Нет данных для отображения</p>
            <p className="text-sm mt-2">Измените фильтры или обновите данные</p>
          </div>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id} className="border-l-4" style={{
              borderLeftColor: 
                log.status === 'error' ? '#ef4444' :
                log.status === 'running' ? '#3b82f6' :
                log.status === 'completed' ? '#22c55e' :
                '#94a3b8'
            }}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{log.name}</h3>
                      {getStatusBadge(log.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Icon name="Hash" size={14} />
                        <span>ID: {log.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="Calendar" size={14} />
                        <span>Запущен: {formatDate(log.started)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon name="User" size={14} />
                        <span>Пользователь: {log.user_id || 'Неизвестно'}</span>
                      </div>
                    </div>
                    
                    {!log.id.startsWith('template_') && (
                      <Button 
                        onClick={() => onViewDetails(log.id)} 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                      >
                        <Icon name="Eye" size={14} className="mr-2" />
                        Посмотреть детали
                      </Button>
                    )}

                    {log.errors && log.errors.length > 0 && (
                      <Alert variant="destructive" className="mt-3">
                        <Icon name="AlertTriangle" size={16} />
                        <AlertDescription>
                          <div className="font-semibold mb-1">Ошибки выполнения:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {log.errors.map((err, idx) => (
                              <li key={idx} className="text-sm">{err}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BpLogsList;