import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import CompaniesTable from './CompaniesTable';
import { DiagnosticResult, CompanyFilters } from './types';

interface CompaniesSectionProps {
  result: DiagnosticResult;
  filteredCompanies: DiagnosticResult['bitrix_companies'];
  selectedCompanies: Set<string>;
  deletingCompanies: boolean;
  filters: CompanyFilters;
  onToggleCompany: (companyId: string) => void;
  onToggleAll: () => void;
  onDeleteSelected: () => void;
  onFilterChange: (filters: CompanyFilters) => void;
}

export default function CompaniesSection({
  result,
  filteredCompanies,
  selectedCompanies,
  deletingCompanies,
  filters,
  onToggleCompany,
  onToggleAll,
  onDeleteSelected,
  onFilterChange,
}: CompaniesSectionProps) {
  return (
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
                  onClick={onDeleteSelected}
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

      <CompaniesTable
        result={result}
        filteredCompanies={filteredCompanies}
        selectedCompanies={selectedCompanies}
        filters={filters}
        onToggleCompany={onToggleCompany}
        onToggleAll={onToggleAll}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}