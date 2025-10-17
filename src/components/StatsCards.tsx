import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Stats {
  total_requests: number;
  duplicates_found: number;
  successful: number;
}

interface StatsCardsProps {
  stats: Stats;
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardDescription className="text-muted-foreground flex items-center gap-2">
            <Icon name="Activity" size={16} />
            Всего запросов
          </CardDescription>
          <CardTitle className="text-4xl font-bold text-foreground">{stats.total_requests}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardDescription className="text-muted-foreground flex items-center gap-2">
            <Icon name="AlertTriangle" size={16} />
            Дубликаты найдено
          </CardDescription>
          <CardTitle className="text-4xl font-bold text-accent">{stats.duplicates_found}</CardTitle>
        </CardHeader>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardDescription className="text-muted-foreground flex items-center gap-2">
            <Icon name="CheckCircle" size={16} />
            Успешных операций
          </CardDescription>
          <CardTitle className="text-4xl font-bold text-primary">{stats.successful}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
