export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  measure: string;
}

export interface Purchase {
  id: number;
  purchase_id: string;
  deal_id: string;
  title: string;
  status: string;
  products_count: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Webhook {
  id: number;
  deal_id: string;
  company_id: string;
  webhook_type: string;
  products_count: number;
  total_amount: number;
  created_at: string;
  source_info: string;
  response_status?: string;
  response_message?: string;
  purchase_created?: boolean;
}

export interface MonthlyStats {
  current_month: {
    count: number;
    total_amount: number;
  };
  previous_month: {
    count: number;
    total_amount: number;
  };
  difference: {
    count: number;
    count_percent: number;
    amount: number;
    amount_percent: number;
  };
}