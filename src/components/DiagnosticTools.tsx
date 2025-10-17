import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

interface DiagnosticResult {
  inn: string;
  bitrix_companies: Array<{
    ID: string;
    TITLE: string;
    DATE_CREATE?: string;
    is_active?: boolean;
    COMPANY_TYPE?: string;
    RQ_INN?: string;
    RQ_KPP?: string;
    PHONE?: string;
    EMAIL?: string;
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
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [deletingCompanies, setDeletingCompanies] = useState(false);
  const [filters, setFilters] = useState({
    title: '',
    type: '',
    inn: '',
    kpp: '',
    phone: '',
    email: '',
  });

  const checkInn = async () => {
    if (!inn.trim()) {
      setError('Введите ИНН для проверки');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedCompanies(new Set());
    setFilters({ title: '', type: '', inn: '', kpp: '', phone: '', email: '' });

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

  const toggleCompanySelection = (companyId: string) => {
    const newSelection = new Set(selectedCompanies);
    if (newSelection.has(companyId)) {
      newSelection.delete(companyId);
    } else {
      newSelection.add(companyId);
    }
    setSelectedCompanies(newSelection);
  };

  const deleteSelectedCompanies = async () => {
    if (selectedCompanies.size === 0) return;

    setDeletingCompanies(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_companies',
          company_ids: Array.from(selectedCompanies),
          inn: result?.inn,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Удалено компаний: ${data.deleted_count}`);
        setSelectedCompanies(new Set());
        checkInn();
      } else {
        alert(`❌ Ошибка: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Ошибка при удалении компаний');
      console.error(err);
    } finally {
      setDeletingCompanies(false);
    }
  };

  const filteredCompanies = useMemo(() => {
    if (!result?.bitrix_companies) return [];

    return result.bitrix_companies.filter((company) => {
      const matchTitle = company.TITLE.toLowerCase().includes(filters.title.toLowerCase());
      const matchType = (company.COMPANY_TYPE || '').toLowerCase().includes(filters.type.toLowerCase());
      const matchInn = (company.RQ_INN || '').includes(filters.inn);
      const matchKpp = (company.RQ_KPP || '').includes(filters.kpp);
      const matchPhone = (company.PHONE || '').includes(filters.phone);
      const matchEmail = (company.EMAIL || '').toLowerCase().includes(filters.email.toLowerCase());

      return matchTitle && matchType && matchInn && matchKpp && matchPhone && matchEmail;
    });
  }, [result, filters]);

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Wrench" size={20} />
          Инструмент диагностики дубликатов
        </CardTitle>
        <CardDescription>
          Проверка ИНН в базе Битрикс24. Безопасное удаление дубликатов и мусорных реквизитов.
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Icon name="Building2" size={16} />
                    Активные компании в Битрикс24: {filteredCompanies.length} из {result.bitrix_companies.length}
                  </p>
                  {result.bitrix_companies.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={selectedCompanies.size === 0 || deletingCompanies}
                        >
                          <Icon name="Trash2" size={14} className="mr-2" />
                          Удалить выбранные ({selectedCompanies.size})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>⚠️ Подтвердите удаление</AlertDialogTitle>
                          <AlertDialogDescription>
                            <div className="space-y-2 mt-2">
                              <p>Будут удалены следующие компании:</p>
                              <ul className="list-disc list-inside bg-secondary p-3 rounded">
                                {Array.from(selectedCompanies).map(id => {
                                  const company = result.bitrix_companies.find(c => c.ID === id);
                                  return (
                                    <li key={id} className="font-mono text-sm">
                                      ID: {id} {company?.TITLE && `— ${company.TITLE}`}
                                    </li>
                                  );
                                })}
                              </ul>
                              <p className="text-destructive font-semibold">Это действие необратимо!</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={deleteSelectedCompanies}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Удалить компании
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                
                {result.bitrix_companies.length > 1 && (
                  <Alert className="bg-accent/10 border-accent/20">
                    <Icon name="AlertTriangle" size={16} className="text-accent" />
                    <AlertDescription>
                      <p className="font-semibold">Обнаружены дубликаты компаний!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Найдено {result.bitrix_companies.length} компаний с одинаковым ИНН. 
                        Выберите компании для удаления (оставьте минимум одну).
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {result.bitrix_companies.length > 1 && <TableHead className="w-[50px]">Выбор</TableHead>}
                        <TableHead className="min-w-[80px]">ID</TableHead>
                        <TableHead className="min-w-[200px]">
                          <div className="space-y-1">
                            <div>Наименование</div>
                            <Input
                              placeholder="Фильтр..."
                              value={filters.title}
                              onChange={(e) => setFilters(f => ({ ...f, title: e.target.value }))}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[150px]">
                          <div className="space-y-1">
                            <div>Тип компании</div>
                            <Input
                              placeholder="Фильтр..."
                              value={filters.type}
                              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          <div className="space-y-1">
                            <div>ИНН</div>
                            <Input
                              placeholder="Фильтр..."
                              value={filters.inn}
                              onChange={(e) => setFilters(f => ({ ...f, inn: e.target.value }))}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[120px]">
                          <div className="space-y-1">
                            <div>КПП</div>
                            <Input
                              placeholder="Фильтр..."
                              value={filters.kpp}
                              onChange={(e) => setFilters(f => ({ ...f, kpp: e.target.value }))}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[140px]">
                          <div className="space-y-1">
                            <div>Телефон</div>
                            <Input
                              placeholder="Фильтр..."
                              value={filters.phone}
                              onChange={(e) => setFilters(f => ({ ...f, phone: e.target.value }))}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[180px]">
                          <div className="space-y-1">
                            <div>Email</div>
                            <Input
                              placeholder="Фильтр..."
                              value={filters.email}
                              onChange={(e) => setFilters(f => ({ ...f, email: e.target.value }))}
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={result.bitrix_companies.length > 1 ? 8 : 7} className="text-center text-muted-foreground">
                            Нет компаний, соответствующих фильтрам
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompanies.map((company) => (
                          <TableRow 
                            key={company.ID}
                            className={selectedCompanies.has(company.ID) ? 'bg-destructive/20' : ''}
                          >
                            {result.bitrix_companies.length > 1 && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedCompanies.has(company.ID)}
                                  onCheckedChange={() => toggleCompanySelection(company.ID)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-mono font-semibold">{company.ID}</TableCell>
                            <TableCell>{company.TITLE}</TableCell>
                            <TableCell>{company.COMPANY_TYPE || '—'}</TableCell>
                            <TableCell className="font-mono">{company.RQ_INN || '—'}</TableCell>
                            <TableCell className="font-mono">{company.RQ_KPP || '—'}</TableCell>
                            <TableCell className="font-mono">{company.PHONE || '—'}</TableCell>
                            <TableCell>{company.EMAIL || '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
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
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ Подтвердите очистку реквизитов</AlertDialogTitle>
                        <AlertDialogDescription>
                          <div className="space-y-2 mt-2">
                            <p>Будут удалены {result.summary.orphaned_requisites} мусорных реквизитов:</p>
                            <ul className="list-disc list-inside bg-secondary p-3 rounded max-h-[200px] overflow-y-auto">
                              {result.requisites_in_db
                                .filter(req => !req.company_exists)
                                .map(req => (
                                  <li key={req.id} className="font-mono text-sm">
                                    Реквизит ID: {req.id} → Компания {req.entity_id} (не найдена)
                                  </li>
                                ))}
                            </ul>
                            <p className="text-sm text-muted-foreground">
                              Это безопасная операция - удаляются только реквизиты несуществующих компаний.
                            </p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={cleanOrphanedRequisites}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Удалить реквизиты
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </AlertDescription>
              </Alert>
            )}

            {result.summary.orphaned_requisites === 0 && result.bitrix_companies.length === 1 && (
              <Alert className="bg-primary/10 border-primary/20">
                <Icon name="CheckCircle" size={16} className="text-primary" />
                <AlertDescription>
                  <p className="font-semibold">✅ Всё в порядке</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Найдена одна компания с этим ИНН. Дубликатов и мусорных записей не обнаружено.
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