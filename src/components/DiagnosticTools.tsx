import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import DiagnosticSummary from './diagnostic/DiagnosticSummary';
import CompaniesSection from './diagnostic/CompaniesSection';
import RequisitesSection from './diagnostic/RequisitesSection';
import { DiagnosticResult, CompanyFilters } from './diagnostic/types';

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
  const [filters, setFilters] = useState<CompanyFilters>({
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

  const toggleAllCompanies = () => {
    const allSelected = filteredCompanies.every(c => selectedCompanies.has(c.ID));
    
    if (allSelected) {
      const newSelection = new Set(selectedCompanies);
      filteredCompanies.forEach(c => newSelection.delete(c.ID));
      setSelectedCompanies(newSelection);
    } else {
      const newSelection = new Set(selectedCompanies);
      filteredCompanies.forEach(c => newSelection.add(c.ID));
      setSelectedCompanies(newSelection);
    }
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
            <DiagnosticSummary result={result} />

            {result.bitrix_companies.length > 0 && (
              <CompaniesSection
                result={result}
                filteredCompanies={filteredCompanies}
                selectedCompanies={selectedCompanies}
                deletingCompanies={deletingCompanies}
                filters={filters}
                onToggleCompany={toggleCompanySelection}
                onToggleAll={toggleAllCompanies}
                onDeleteSelected={deleteSelectedCompanies}
                onFilterChange={setFilters}
              />
            )}

            <RequisitesSection
              result={result}
              cleaningOrphans={cleaningOrphans}
              onCleanOrphans={cleanOrphanedRequisites}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}