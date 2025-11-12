export interface DealChange {
  id: number;
  deal_id: string;
  event_type: string;
  deal_data: any;
  timestamp_received: string;
  modifier_user_id?: string;
  modifier_user_name?: string;
  previous_stage?: string;
  current_stage?: string;
  changes_summary?: any;
}

export interface RollbackLog {
  id: number;
  deal_id: string;
  action_type: string;
  change_id?: number;
  previous_stage?: string;
  new_stage: string;
  deal_snapshot?: any;
  performed_at: string;
  performed_by: string;
  reason: string;
  success: boolean;
  error_message?: string;
}

export const BACKEND_URL = 'https://functions.poehali.dev/fa7ea1c4-cbac-4964-b75e-c5b527e353c7';
export const ENRICH_URL = 'https://functions.poehali.dev/b597a185-9519-4098-92d3-670edaa7daac';
export const ROLLBACK_URL = 'https://functions.poehali.dev/61454b6b-601a-40b6-81e2-b0a8bc5da4d7';
export const HISTORY_URL = 'https://functions.poehali.dev/96c3dff1-6a64-4e7b-b6a2-c268cd73c842';

export const STAGE_NAMES: Record<string, string> = {
  'NEW': 'Новая',
  'PREPARATION': 'Подготовка',
  'CLIENT': 'Согласование с клиентом',
  'EXECUTING': 'Выполнение',
  'FINAL_INVOICE': 'Финальный счёт',
  'WON': 'Успешно реализована',
  'LOSE': 'Закрыта и не реализована',
};

export const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

export const hasError = (change: DealChange) => {
  return change.deal_data?.error || (!change.current_stage && change.previous_stage);
};
