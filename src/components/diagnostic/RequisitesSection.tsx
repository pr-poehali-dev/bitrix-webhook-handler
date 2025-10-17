import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { DiagnosticResult } from './types';

interface RequisitesSectionProps {
  result: DiagnosticResult;
  cleaningOrphans: boolean;
  onCleanOrphans: () => void;
}

export default function RequisitesSection({ result, cleaningOrphans, onCleanOrphans }: RequisitesSectionProps) {
  if (result.summary.orphaned_requisites === 0) return null;

  return (
    <Alert className="bg-accent/10 border-accent/20">
      <Icon name="AlertTriangle" size={16} className="text-accent" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <p className="font-semibold">Обнаружены мусорные реквизиты</p>
          <p className="text-sm text-muted-foreground mt-1">
            Найдено {result.summary.orphaned_requisites} реквизитов, привязанных к несуществующим компаниям.
            Это может вызывать ложные срабатывания на дубликаты.
          </p>
        </div>
        <Button 
          onClick={onCleanOrphans} 
          disabled={cleaningOrphans}
          variant="outline"
          size="sm"
        >
          {cleaningOrphans ? (
            <>
              <Icon name="Loader2" size={14} className="mr-2 animate-spin" />
              Очистка...
            </>
          ) : (
            <>
              <Icon name="Trash2" size={14} className="mr-2" />
              Очистить
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
