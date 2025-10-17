import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface LogDetailsDialogProps {
  selectedLog: WebhookLog | null;
  onClose: () => void;
  formatDate: (dateStr: string) => string;
  getStatusBadge: (status: string, duplicate: boolean) => JSX.Element;
}

export default function LogDetailsDialog({
  selectedLog,
  onClose,
  formatDate,
  getStatusBadge,
}: LogDetailsDialogProps) {
  return (
    <Dialog open={!!selectedLog} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Info" size={20} />
            Детали запроса #{selectedLog?.id}
          </DialogTitle>
          <DialogDescription>
            Полная информация о webhook запросе
          </DialogDescription>
        </DialogHeader>
        
        {selectedLog && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Дата и время</p>
                <p className="text-sm font-mono">{formatDate(selectedLog.created_at)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Метод запроса</p>
                <Badge variant={selectedLog.request_method === 'GET' ? 'outline' : 'secondary'} className="font-mono">
                  {selectedLog.request_method || 'POST'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Статус</p>
              {getStatusBadge(selectedLog.response_status, selectedLog.duplicate_found)}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">ID компании</p>
                <p className="text-sm font-mono">{selectedLog.bitrix_company_id || '—'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">ИНН</p>
                <p className="text-sm font-mono font-semibold text-primary">{selectedLog.inn || '—'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Источник запроса</p>
              <p className="text-xs font-mono bg-secondary p-2 rounded">{selectedLog.source_info || 'Unknown'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Действие</p>
              <p className="text-sm">{selectedLog.action_taken}</p>
            </div>

            {(() => {
              try {
                const requestBody = JSON.parse(selectedLog.request_body);
                const searchDetails = requestBody.search_details;
                
                if (searchDetails) {
                  return (
                    <div className="space-y-2 p-4 bg-accent/10 border border-accent/20 rounded-md">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Icon name="Search" size={16} />
                        Результаты поиска дубликатов
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-semibold text-muted-foreground">ИНН для поиска:</span>
                            <p className="font-mono text-primary">{searchDetails.inn_searched}</p>
                          </div>
                          <div>
                            <span className="font-semibold text-muted-foreground">Всего найдено:</span>
                            <p className="font-mono">{searchDetails.total_found} компаний</p>
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-semibold text-muted-foreground">Метод поиска:</span>
                          <p className="font-mono text-xs text-muted-foreground">{searchDetails.search_method}</p>
                        </div>
                        
                        {searchDetails.found_companies && searchDetails.found_companies.length > 0 && (
                          <div className="mt-3">
                            <p className="font-semibold text-muted-foreground mb-2">Найденные компании в Битрикс24:</p>
                            <div className="space-y-1">
                              {searchDetails.found_companies.map((company: any, idx: number) => (
                                <div key={idx} className="p-2 bg-secondary rounded text-xs flex items-center justify-between">
                                  <div>
                                    <span className="font-mono font-semibold">ID: {company.ID}</span>
                                    {company.TITLE && <span className="ml-2 text-muted-foreground">— {company.TITLE}</span>}
                                  </div>
                                  {String(company.ID) === String(searchDetails.current_company_id) && (
                                    <Badge variant="outline" className="text-xs">Текущая</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {searchDetails.comparison_details && (
                          <div className="mt-3 p-2 bg-secondary/50 rounded">
                            <p className="font-semibold text-muted-foreground mb-1">Детали сравнения ID:</p>
                            <div className="space-y-1 text-xs">
                              <p>Текущая компания: <span className="font-mono">{searchDetails.comparison_details.bitrix_id}</span> ({searchDetails.comparison_details.bitrix_id_type})</p>
                              {searchDetails.comparison_details.found_ids_with_types && (
                                <div>
                                  <p className="text-muted-foreground mt-1">Найденные ID с типами:</p>
                                  {searchDetails.comparison_details.found_ids_with_types.map((item: any, idx: number) => (
                                    <p key={idx} className="ml-2 font-mono">
                                      {item.id} ({item.type}) — {item.title}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              } catch (e) {
                console.error('Error parsing search details:', e);
              }
              return null;
            })()}

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Тело запроса (полное)</p>
              <pre className="text-xs bg-secondary p-3 rounded overflow-x-auto max-h-[300px]">
                {JSON.stringify(JSON.parse(selectedLog.request_body), null, 2)}
              </pre>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Тип webhook</p>
              <Badge variant="outline">{selectedLog.webhook_type}</Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
