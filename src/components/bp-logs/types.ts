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
  status: string;
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
}
