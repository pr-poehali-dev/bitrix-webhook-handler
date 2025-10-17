import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';

interface DiagnosticResult {
  inn: string;
  bitrix_companies: Array<{
    ID: string;
    TITLE: string;
    DATE_CREATE?: string;
    is_active?: boolean;
  }>;
  requisites_in_db: Array<{
    id: string;
    entity_id: string;
    entity_type_id: string;
    inn: string;
    company_exists: boolean;
  }>;
  summary: {
    total_bitrix: number;
    total_requisites: number;
    orphaned_requisites: number;
  };
}

interface DiagnosticToolsProps {
  apiUrl: string;
}

export default function DiagnosticTools({ apiUrl }: DiagnosticToolsProps) {
  const [inn, setInn] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState('');
  const [cleaningOrphans, setCleaningOrphans] = useState(false);

  const checkInn = async () => {
    if (!inn.trim()) {
      setError('Введите ИНН для проверки');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${apiUrl}?action=diagnose&inn=${encodeURIComponent(inn.trim())}`);
      const data = await response.json();

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'Ошибка при проверке ИНН');
      }
    } catch (err) {
      setError('Ошибка подключения к API');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cleanOrphanedRequisites = async () => {
    if (!result) return;

    setCleaningOrphans(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clean_orphans',
          inn: result.inn,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Удалено ${data.cleaned_count} мусорных реквизитов`);
        checkInn();
      } else {
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Ошибка при очистке');
      console.error(err);
    } finally {
      setCleaningOrphans(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Wrench" size={20} />
          Инструмент диагностики дубликатов
        </CardTitle>
        <CardDescription>
          Проверка ИНН в базе Битрикс24 и внутренней БД. Очистка мусорных реквизитов.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Введите ИНН для проверки"
            value={inn}
            onChange={(e) => setInn(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && checkInn()}
            className="font-mono"
          />
          <Button onClick={checkInn} disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Проверка...
              </>
            ) : (
              <>
                <Icon name="Search" size={16} className="mr-2" />
                Проверить
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <Icon name="AlertCircle" size={16} />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-secondary/50">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Активных компаний в Битрикс24</CardDescription>
                  <CardTitle className="text-2xl">{result.summary.total_bitrix}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-secondary/50">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Реквизитов в БД</CardDescription>
                  <CardTitle className="text-2xl">{result.summary.total_requisites}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-accent/10 border-accent/20">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">Мусорных реквизитов</CardDescription>
                  <CardTitle className="text-2xl text-accent">{result.summary.orphaned_requisites}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {result.bitrix_companies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Icon name="Building2" size={16} />
                  Активные компании в Битрикс24:
                </p>
                <div className="space-y-1">
                  {result.bitrix_companies.map((company) => (
                    <div key={company.ID} className="p-3 bg-secondary rounded flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold">ID: {company.ID}</span>
                        {company.TITLE && <span className="ml-2 text-muted-foreground">— {company.TITLE}</span>}
                      </div>
                      {company.DATE_CREATE && (
                        <span className="text-xs text-muted-foreground">{company.DATE_CREATE}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.requisites_in_db.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Icon name="FileText" size={16} />
                  Реквизиты в базе данных:
                </p>
                <div className="space-y-1">
                  {result.requisites_in_db.map((req) => (
                    <div
                      key={req.id}
                      className={`p-3 rounded flex items-center justify-between ${
                        req.company_exists ? 'bg-secondary' : 'bg-destructive/10 border border-destructive/20'
                      }`}
                    >
                      <div className="text-sm">
                        <span className="font-mono">Реквизит ID: {req.id}</span>
                        <span className="mx-2">→</span>
                        <span className="font-mono">Компания: {req.entity_id}</span>
                      </div>
                      <Badge variant={req.company_exists ? 'outline' : 'destructive'}>
                        {req.company_exists ? 'Активна' : 'Мусор'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.summary.orphaned_requisites > 0 && (
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
                    variant="destructive"
                    onClick={cleanOrphanedRequisites}
                    disabled={cleaningOrphans}
                    className="ml-4"
                  >
                    {cleaningOrphans ? (
                      <>
                        <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                        Очистка...
                      </>
                    ) : (
                      <>
                        <Icon name="Trash2" size={16} className="mr-2" />
                        Очистить
                      </>
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {result.summary.orphaned_requisites === 0 && result.requisites_in_db.length > 0 && (
              <Alert className="bg-primary/10 border-primary/20">
                <Icon name="CheckCircle" size={16} className="text-primary" />
                <AlertDescription>
                  <p className="font-semibold">База данных в порядке</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Все реквизиты привязаны к активным компаниям.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
