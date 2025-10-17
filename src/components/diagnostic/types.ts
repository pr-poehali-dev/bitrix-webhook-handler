export interface DiagnosticResult {
  inn: string;
  bitrix_companies: Array<{
    ID: string;
    TITLE: string;
    DATE_CREATE?: string;
    is_active?: boolean;
    COMPANY_TYPE?: string;
    RQ_INN?: string;
    RQ_KPP?: string;
    PHONE?: string;
    EMAIL?: string;
  }>;
  requisites_in_db: Array<{
    id: string;
    entity_id: string;
    entity_type_id: string;
    inn: string;
    company_exists: boolean;
  }>;
  summary: {
    total_bitrix: number;
    total_requisites: number;
    orphaned_requisites: number;
  };
}

export interface CompanyFilters {
  title: string;
  type: string;
  inn: string;
  kpp: string;
  phone: string;
  email: string;
}
