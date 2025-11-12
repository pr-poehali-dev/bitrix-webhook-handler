import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface DealChangesFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: () => void;
  enriching: boolean;
  onEnrich: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  loading: boolean;
  onRefresh: () => void;
}

export default function DealChangesFilters({
  searchQuery,
  setSearchQuery,
  onSearch,
  enriching,
  onEnrich,
  autoRefresh,
  setAutoRefresh,
  loading,
  onRefresh,
}: DealChangesFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Фильтры и настройки</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEnrich}
              disabled={enriching}
            >
              <Icon name={enriching ? 'Loader2' : 'UserPlus'} size={16} className={`mr-2 ${enriching ? 'animate-spin' : ''}`} />
              {enriching ? 'Загрузка...' : 'Загрузить имена'}
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Icon name={autoRefresh ? 'PauseCircle' : 'PlayCircle'} size={16} className="mr-2" />
              {autoRefresh ? 'Остановить' : 'Авто-обновление'}
            </Button>
            <Button onClick={onRefresh} disabled={loading} size="sm">
              <Icon name="RefreshCw" size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Поиск по ID, названию, стадии или имени пользователя..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch();
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
