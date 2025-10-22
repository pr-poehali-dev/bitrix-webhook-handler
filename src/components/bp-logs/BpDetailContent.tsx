import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { BpDetail } from './types';
import { getStatusBadge, formatDate } from './utils.tsx';

interface BpDetailContentProps {
  bpDetail: BpDetail | null;
  loading: boolean;
}

const BpDetailContent = ({ bpDetail, loading }: BpDetailContentProps) => {
  if (loading) {
    return (
      <Card className="bg-slate-50">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Icon name="Loader2" size={32} className="animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bpDetail) {
    return (
      <Card className="bg-slate-50">
        <CardContent className="py-8">
          <div className="text-center text-slate-500">
            Не удалось загрузить детали
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-50 border-2 border-slate-200">
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-600">Шаблон</div>
            <div className="text-base">{bpDetail.template_name || 'Неизвестно'}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-600">ID шаблона</div>
            <div className="text-base font-mono">{bpDetail.template_id}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-600">Запущен</div>
            <div className="text-base">{formatDate(bpDetail.started)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-600">Изменён</div>
            <div className="text-base">{formatDate(bpDetail.modified)}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-600">Запустил</div>
            <div className="text-base">ID: {bpDetail.started_by}</div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-600">Документ</div>
            <div className="text-base font-mono text-xs">
              {Array.isArray(bpDetail.document_id) 
                ? bpDetail.document_id.join(' / ') 
                : bpDetail.document_id}
            </div>
          </div>
        </div>

        {bpDetail.stats && (
          <div className="space-y-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="BarChart3" size={18} />
              Статистика запусков
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{bpDetail.stats.total_runs}</div>
                    <div className="text-sm text-slate-600 mt-1">Всего запусков</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{bpDetail.stats.runs_by_user.length}</div>
                    <div className="text-sm text-slate-600 mt-1">Уникальных пользователей</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {bpDetail.stats.recent_runs.length > 0 
                        ? formatDate(bpDetail.stats.recent_runs[0].started).split(' ')[0]
                        : 'Нет данных'}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">Последний запуск</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {bpDetail.stats.runs_by_user.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-semibold flex items-center gap-2">
                  <Icon name="Users" size={16} />
                  Статистика по пользователям
                </h5>
                <div className="space-y-2">
                  {bpDetail.stats.runs_by_user.map((user, idx) => (
                    <Card key={idx} className="bg-white">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon name="User" size={16} className="text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">Пользователь ID: {user.user_id}</div>
                              <div className="text-xs text-slate-500">
                                Последний запуск: {formatDate(user.last_run)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">{user.count} запусков</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {bpDetail.stats.recent_runs.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-semibold flex items-center gap-2">
                  <Icon name="Clock" size={16} />
                  Последние запуски
                </h5>
                <div className="space-y-2">
                  {bpDetail.stats.recent_runs.map((run, idx) => (
                    <Card key={idx} className="bg-white">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm font-medium">ID: {run.id}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              Запустил: Пользователь {run.started_by} • {formatDate(run.started)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {bpDetail.tasks && bpDetail.tasks.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="ListChecks" size={18} />
              История задач ({bpDetail.tasks.length})
            </h4>
            <div className="space-y-2">
              {bpDetail.tasks.map((task) => (
                <Card key={task.id} className="bg-white">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">{task.name}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          ID: {task.id} • Пользователь: {task.user_id}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Изменено: {formatDate(task.modified)}
                        </div>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {bpDetail.history && bpDetail.history.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="History" size={18} />
              История выполнения ({bpDetail.history.length})
            </h4>
            <div className="space-y-2">
              {bpDetail.history.map((item, idx) => (
                <Card key={item.id || idx} className="bg-white border-l-4 border-blue-500">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium">{item.action_name || item.name}</div>
                          {item.note && (
                            <div className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded">
                              {item.note}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {item.execution_status === '0' && 'Успешно'}
                          {item.execution_status === '1' && 'Выполняется'}
                          {item.execution_status === '2' && 'Отменено'}
                          {item.execution_status === '3' && 'Ошибка'}
                          {item.execution_status === '4' && 'Тайм-аут'}
                          {!item.execution_status && 'Статус неизвестен'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" size={12} />
                          {formatDate(item.modified)}
                        </span>
                        {item.execution_time && (
                          <span className="flex items-center gap-1">
                            <Icon name="Timer" size={12} />
                            {item.execution_time}с
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Icon name="User" size={12} />
                          ID: {item.user_id}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {bpDetail.workflow_status && Object.keys(bpDetail.workflow_status).length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Icon name="Info" size={18} />
              Статус процесса
            </h4>
            <pre className="bg-white p-4 rounded-lg text-xs overflow-x-auto border">
              {JSON.stringify(bpDetail.workflow_status, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BpDetailContent;