import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { MonthlyStats } from './types';

interface PurchaseAnalyticsProps {
  stats: MonthlyStats | null;
}

export default function PurchaseAnalytics({ stats }: PurchaseAnalyticsProps) {
  if (!stats) return null;

  const { current_month, previous_month, difference } = stats;

  const getChangeIcon = (percent: number) => {
    if (percent > 0) return { icon: 'TrendingUp', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (percent < 0) return { icon: 'TrendingDown', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    return { icon: 'Minus', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  const countChange = getChangeIcon(difference.count_percent);
  const amountChange = getChangeIcon(difference.amount_percent);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Количество закупок */}
      <Card className={`${countChange.bg} border-2 ${countChange.border}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon name="ShoppingCart" size={16} />
            Количество закупок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">{current_month.count}</div>
              <p className="text-xs text-muted-foreground mt-1">Текущий месяц</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${countChange.color} font-semibold`}>
                <Icon name={countChange.icon} size={20} />
                <span className="text-lg">
                  {difference.count > 0 ? '+' : ''}{difference.count}
                </span>
              </div>
              <Badge variant="secondary" className="mt-1">
                {difference.count_percent > 0 ? '+' : ''}{difference.count_percent.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Прошлый месяц:</span>
            <span className="font-medium">{previous_month.count}</span>
          </div>
        </CardContent>
      </Card>

      {/* Сумма закупок */}
      <Card className={`${amountChange.bg} border-2 ${amountChange.border}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon name="DollarSign" size={16} />
            Сумма закупок
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">
                {current_month.total_amount.toLocaleString('ru-RU')} ₽
              </div>
              <p className="text-xs text-muted-foreground mt-1">Текущий месяц</p>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${amountChange.color} font-semibold`}>
                <Icon name={amountChange.icon} size={20} />
                <span className="text-lg">
                  {difference.amount > 0 ? '+' : ''}{Math.abs(difference.amount).toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <Badge variant="secondary" className="mt-1">
                {difference.amount_percent > 0 ? '+' : ''}{difference.amount_percent.toFixed(1)}%
              </Badge>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Прошлый месяц:</span>
            <span className="font-medium">{previous_month.total_amount.toLocaleString('ru-RU')} ₽</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
