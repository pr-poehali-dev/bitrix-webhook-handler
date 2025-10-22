export interface BpLog {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'error' | 'terminated' | 'unknown' | 'template';
  started: string;
  user_id: string;
  document_id: string | string[];
  errors: string[];
  last_activity: string;
}

export interface BpDetail {
  id: string;
  template_id: string;
  template_name: string;
  document_id: string | string[];
  started: string;
  started_by: string;
  status?: string;
  modified: string;
  workflow_status: Record<string, any>;
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    modified: string;
    user_id: string;
  }>;
  history: Array<{
    id: string;
    name: string;
    modified: string;
    user_id: string;
    execution_status: string;
    execution_time: string;
    note: string;
    action: string;
    action_name: string;
  }>;
  stats?: {
    total_runs: number;
    runs_by_user: Array<{
      user_id: string;
      count: number;
      last_run: string;
    }>;
    runs_by_date: Array<{
      date: string;
      count: number;
    }>;
    recent_runs: Array<{
      id: string;
      started: string;
      started_by: string;
      document_id: string;
    }>;
  };
}