import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

export const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: any; icon: string; label: string }> = {
    running: { variant: 'default', icon: 'Loader2', label: 'Выполняется' },
    completed: { variant: 'default', icon: 'CheckCircle2', label: 'Завершён' },
    error: { variant: 'destructive', icon: 'XCircle', label: 'Ошибка' },
    terminated: { variant: 'secondary', icon: 'StopCircle', label: 'Прерван' },
    template: { variant: 'outline', icon: 'FileCode', label: 'Шаблон' },
    unknown: { variant: 'outline', icon: 'HelpCircle', label: 'Неизвестно' },
  };

  const config = variants[status] || variants.unknown;
  
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon name={config.icon} size={14} />
      {config.label}
    </Badge>
  );
};

export const formatDate = (dateString: string) => {
  if (!dateString) return 'Нет данных';
  try {
    return new Date(dateString).toLocaleString('ru-RU');
  } catch {
    return dateString;
  }
};
