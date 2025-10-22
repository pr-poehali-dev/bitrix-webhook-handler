import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface BpLogsFiltersProps {
  source: 'api' | 'db';
  statusFilter: string;
  searchQuery: string;
  autoRefresh: boolean;
  loading: boolean;
  onSourceChange: (source: 'api' | 'db') => void;
  onStatusFilterChange: (status: string) => void;
  onSearchQueryChange: (query: string) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
}

const BpLogsFilters = ({
  source,
  statusFilter,
  searchQuery,
  autoRefresh,
  loading,
  onSourceChange,
  onStatusFilterChange,
  onSearchQueryChange,
  onAutoRefreshChange,
  onRefresh,
}: BpLogsFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="Settings" size={20} />
          Настройки мониторинга
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="source">Источник данных</Label>
            <Select value={source} onValueChange={onSourceChange}>
              <SelectTrigger id="source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api">REST API</SelectItem>
                <SelectItem value="db">База данных</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Фильтр по статусу</Label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="running">Выполняются</SelectItem>
                <SelectItem value="error">Ошибки</SelectItem>
                <SelectItem value="completed">Завершённые</SelectItem>
                <SelectItem value="terminated">Прерванные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="search">Поиск по названию/ID</Label>
            <Input
              id="search"
              placeholder="Введите текст..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={onRefresh} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                <>
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Обновить
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
          />
          <Label htmlFor="auto-refresh" className="cursor-pointer">
            Автообновление каждые 10 секунд
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default BpLogsFilters;
