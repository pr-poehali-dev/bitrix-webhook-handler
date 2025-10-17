import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { DiagnosticResult, CompanyFilters } from './types';

interface CompaniesTableProps {
  result: DiagnosticResult;
  filteredCompanies: DiagnosticResult['bitrix_companies'];
  selectedCompanies: Set<string>;
  filters: CompanyFilters;
  onToggleCompany: (companyId: string) => void;
  onToggleAll: () => void;
  onFilterChange: (filters: CompanyFilters) => void;
}

export default function CompaniesTable({
  result,
  filteredCompanies,
  selectedCompanies,
  filters,
  onToggleCompany,
  onToggleAll,
  onFilterChange,
}: CompaniesTableProps) {
  const allSelected = filteredCompanies.length > 0 && filteredCompanies.every(c => selectedCompanies.has(c.ID));
  const someSelected = filteredCompanies.some(c => selectedCompanies.has(c.ID)) && !allSelected;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {result.bitrix_companies.length > 1 && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={onToggleAll}
                  aria-label="Выбрать все"
                />
              </TableHead>
            )}
            <TableHead className="min-w-[80px]">ID</TableHead>
            <TableHead className="min-w-[200px]">
              <div className="space-y-1">
                <div>Наименование</div>
                <Input
                  placeholder="Фильтр..."
                  value={filters.title}
                  onChange={(e) => onFilterChange({ ...filters, title: e.target.value })}
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
                  onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
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
                  onChange={(e) => onFilterChange({ ...filters, inn: e.target.value })}
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
                  onChange={(e) => onFilterChange({ ...filters, kpp: e.target.value })}
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
                  onChange={(e) => onFilterChange({ ...filters, phone: e.target.value })}
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
                  onChange={(e) => onFilterChange({ ...filters, email: e.target.value })}
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
                      onCheckedChange={() => onToggleCompany(company.ID)}
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
  );
}