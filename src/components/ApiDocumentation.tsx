import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface ApiDocumentationProps {
  apiUrl: string;
}

export default function ApiDocumentation({ apiUrl }: ApiDocumentationProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Terminal" size={20} />
          API для интеграции с Битрикс24
        </CardTitle>
        <CardDescription>Используйте этот endpoint в дизайнере бизнес-процессов</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Webhook URL:</p>
          <code className="block p-3 bg-secondary rounded-md text-primary font-mono text-sm break-all">
            {apiUrl}
          </code>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Метод:</p>
          <Badge variant="outline" className="font-mono">POST</Badge>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Формат запроса:</p>
          <pre className="p-4 bg-secondary rounded-md text-foreground text-sm overflow-x-auto">
{`{
  "bitrix_id": "12345"
}`}
          </pre>
          <p className="text-xs text-muted-foreground mt-2">
            ИНН автоматически извлекается из Битрикс24 по ID компании
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Ответ при дубликате (автоудаление):</p>
          <pre className="p-4 bg-secondary rounded-md text-foreground text-sm overflow-x-auto">
{`{
  "duplicate": true,
  "inn": "7707083893",
  "existing_company": {...},
  "action": "deleted",
  "deleted": true,
  "message": "Auto-deleted duplicate..."
}`}
          </pre>
        </div>
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-md">
          <div className="flex items-start gap-2">
            <Icon name="AlertCircle" size={16} className="text-accent mt-0.5" />
            <div className="text-sm text-foreground">
              <p className="font-semibold mb-1">Автоматическое удаление новых дубликатов</p>
              <p className="text-muted-foreground">
                При обнаружении дубликата ИНН система автоматически удалит НОВУЮ компанию (которую только что создали) через Bitrix24 REST API. Старая компания сохраняется.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
