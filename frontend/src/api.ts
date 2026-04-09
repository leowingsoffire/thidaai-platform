const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { headers, ...options });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Types ----

export interface AuthUser {
  id: string; email: string; full_name: string; role: string;
  department: string | null; phone: string | null; is_active: boolean;
  last_login: string | null; created_at: string;
}

export interface Client {
  id: string; full_name: string; email: string | null; phone: string | null;
  date_of_birth: string | null; gender: string | null; occupation: string | null;
  monthly_income: number | null; marital_status: string | null; dependents: number;
  address: string | null; notes: string | null;
  client_type: string; company_name: string | null; industry: string | null;
  created_at: string; updated_at: string;
}

export interface Policy {
  id: string; client_id: string; policy_number: string; product_name: string;
  policy_type: string; premium_amount: number; sum_assured: number | null;
  premium_frequency: string; start_date: string; end_date: string | null;
  status: string; version: number; underwriting_status: string | null;
  risk_score: number | null; created_at: string; client_name?: string;
}

export interface WorkflowTask {
  id: string; workflow_instance_id: string; title: string; description: string | null;
  assigned_to: string | null; assigned_role: string | null; status: string;
  priority: string; due_date: string | null; created_at: string;
  entity_type?: string; entity_id?: string; current_state?: string;
  workflow_type?: string;
}

export interface WorkflowInstance {
  id: string; definition_id: string; entity_type: string; entity_id: string;
  current_state: string; priority: string; started_by: string; is_escalated: boolean;
  sla_deadline: string | null; created_at: string; updated_at: string;
  definition_name?: string; started_by_name?: string;
  history?: any[];
}

export interface UnderwritingCase {
  id: string; policy_id: string; client_id: string; risk_category: string;
  risk_score: number; risk_factors: any; auto_decision: string | null;
  decision: string | null; decided_by: string | null; loading_percentage: number | null;
  exclusions: string | null; notes: string | null; status: string;
  workflow_instance_id: string | null; created_at: string;
  policy_number?: string; client_name?: string; product_name?: string;
}

export interface Claim {
  id: string; claim_number: string; policy_id: string; client_id: string;
  claim_type: string; claim_amount: number; approved_amount: number | null;
  incident_date: string; incident_description: string | null; status: string;
  fraud_flag: boolean; fraud_score: number | null; fraud_notes: string | null;
  documents_verified: boolean; assessor_id: string | null;
  assessment_notes: string | null; payment_method: string | null;
  payment_reference: string | null; payment_date: string | null;
  workflow_instance_id: string | null; created_at: string; updated_at: string;
  policy_number?: string; client_name?: string; product_name?: string;
  assessor_name?: string;
}

export interface Notification {
  id: string; user_id: string; title: string; message: string;
  notification_type: string; channel: string; is_read: boolean;
  link: string | null; created_at: string;
}

export interface AuditLogEntry {
  id: string; user_id: string; action: string; entity_type: string;
  entity_id: string; details: any; ip_address: string | null;
  created_at: string; user_name: string | null;
}

export interface Activity {
  id: string; client_id: string | null; activity_type: string; title: string;
  description: string | null; scheduled_date: string | null; completed_date: string | null;
  status: string; outcome: string | null; created_at: string; client_name?: string;
}

export interface Commission {
  id: string; policy_id: string | null; commission_type: string; amount: number;
  period: string | null; status: string; paid_date: string | null; notes: string | null;
  created_at: string; policy_number?: string; client_name?: string;
}

export interface PipelineDeal {
  id: string; client_id: string; product_name: string; expected_premium: number;
  stage: string; probability: number; expected_close_date: string | null;
  notes: string | null; created_at: string; updated_at: string; client_name?: string;
}

export interface DashboardData {
  total_clients: number; new_clients_month: number; total_policies: number;
  active_policies: number; total_premium: number; new_policies_month: number;
  monthly_premium: number; total_earned: number; pending_commission: number;
  pipeline_value: number; pipeline_deals: number; activities_today: number;
  activities_week: number; activities_completed: number;
  mdrt_progress_pct: number; mdrt_cases_pct: number;
  mdrt_data: { target_premium: number; achieved_premium: number; target_cases: number; achieved_cases: number } | null;
  recent_activities: { id: string; title: string; activity_type: string; status: string; client_name: string | null; scheduled_date: string | null }[];
  product_breakdown: Record<string, { count: number; premium: number }>;
  // NEW fields
  ai_recommendations?: AIRecommendation[];
  revenue_tracker?: RevenueMonth[];
  daily_pipeline?: PipelineStage[];
  pending_approvals?: number;
  upcoming_greetings?: number;
  scheduled_content?: number;
}

export interface AIRecommendation {
  type: string; priority: string; icon: string;
  title: string; description: string; action: string;
}

export interface RevenueMonth {
  month: string; premium: number; commission: number;
}

export interface PipelineStage {
  stage: string; count: number;
  deals: { id: string; client_name: string; expected_premium: number; probability: number }[];
}

export interface CorporateProfile {
  id: string; client_id: string; company_name: string; industry: string;
  employee_count: number; avg_employee_age: number; annual_revenue: number;
  existing_benefits: Record<string, any>; risk_profile: string;
  analysis_result: Record<string, any>; group_plans: any[];
  hr_contact_name: string; hr_contact_email: string; hr_contact_phone: string;
  created_at: string;
}

export interface ContentPost {
  id: string; title: string; content: string; platform: string;
  post_type: string; scheduled_date: string | null; status: string;
  hashtags: string; language: string; engagement_score: number; created_at: string;
}

export interface ObjectionScript {
  id: string; objection: string; category: string;
  response_en: string; response_my: string;
  tips: string; effectiveness_rating: number; times_used: number;
}

export interface AutoGreetingItem {
  id: string; client_id: string; client_name: string; greeting_type: string;
  message: string; channel: string; status: string;
  sent_at: string | null; created_at: string;
}

export interface UpcomingEvent {
  client_id: string; client_name: string; event_type: string;
  event_date: string; days_until: number;
  phone?: string; email?: string; policy_number?: string; years?: number;
}

export interface NeedsAnalysis {
  id: string; client_id: string; analysis_data: Record<string, any>;
  ai_recommendations: string | null; created_at: string;
}

export interface Proposal {
  id: string; client_id: string; title: string; proposal_data: Record<string, any>;
  pdf_path: string | null; status: string; created_at: string;
}

export interface MDRTProgress {
  id: string; year: number; target_premium: number; achieved_premium: number;
  target_cases: number; achieved_cases: number; progress_percentage: number;
  cases_percentage: number; notes: string | null;
}

export interface FinancialPlan {
  id: string; client_id: string; plan_type: string;
  input_data: Record<string, any>; result_data: Record<string, any>; created_at: string;
}

export interface AIConversationMsg {
  id: string; direction: 'inbound' | 'outbound'; message: string;
  intent: string | null; channel: string; action_taken: string | null; created_at: string | null;
}

export interface ApprovalItem {
  id: string; title: string; description: string | null; action_type: string;
  action_data: Record<string, any>; entity_type: string | null; entity_id: string | null;
  priority: string; status: string; ai_confidence: number | null; channel: string | null;
  executed_result: Record<string, any> | null; expires_at: string | null;
  created_at: string | null; approved_at: string | null; rejected_at: string | null;
  rejection_reason: string | null;
}

export interface AIChatResponse {
  reply: string; intent: string; entities: Record<string, any>;
  approval_id?: string; approvals?: Array<{ id: string; title: string }>;
}

// ---- API methods ----

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: AuthUser }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  register: (data: any) => request<{ access_token: string; token_type: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<AuthUser>('/auth/me'),
  getUsers: () => request<AuthUser[]>('/auth/users'),

  // Dashboard
  getDashboard: () => request<DashboardData>('/dashboard/stats'),

  // Clients
  getClients: () => request<Client[]>('/clients'),
  getClient: (id: string) => request<Client>(`/clients/${id}`),
  createClient: (data: Partial<Client>) => request<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<Client>) => request<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),

  // Policies
  getPolicies: (clientId?: string) => request<Policy[]>(`/policies${clientId ? `?client_id=${clientId}` : ''}`),
  createPolicy: (data: any) => request<Policy>('/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id: string, data: any) => request<Policy>(`/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Workflow
  getMyTasks: () => request<WorkflowTask[]>('/workflows/my-tasks'),
  getWorkflowInstances: (entity_type?: string) =>
    request<WorkflowInstance[]>(`/workflows/instances${entity_type ? `?entity_type=${entity_type}` : ''}`),
  getWorkflowInstance: (id: string) => request<WorkflowInstance>(`/workflows/instances/${id}`),
  transitionWorkflow: (id: string, action: string, new_state: string, comments?: string) =>
    request<any>(`/workflows/instances/${id}/transition`, {
      method: 'POST', body: JSON.stringify({ action, new_state, comments }),
    }),

  // Underwriting
  getUnderwritingCases: (status?: string) =>
    request<UnderwritingCase[]>(`/underwriting${status ? `?status=${status}` : ''}`),
  createUnderwritingCase: (policy_id: string) =>
    request<UnderwritingCase>('/underwriting', { method: 'POST', body: JSON.stringify({ policy_id }) }),
  getUnderwritingCase: (id: string) => request<UnderwritingCase>(`/underwriting/${id}`),
  underwritingDecision: (id: string, decision: string, loading_percentage?: number, exclusions?: string, notes?: string) =>
    request<UnderwritingCase>(`/underwriting/${id}/decision`, {
      method: 'POST', body: JSON.stringify({ decision, loading_percentage, exclusions, notes }),
    }),

  // Claims
  getClaims: (status?: string) => request<Claim[]>(`/claims${status ? `?status=${status}` : ''}`),
  getClaim: (id: string) => request<Claim>(`/claims/${id}`),
  submitClaim: (data: any) => request<Claim>('/claims', { method: 'POST', body: JSON.stringify(data) }),
  updateClaim: (id: string, data: any) => request<Claim>(`/claims/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  approveClaim: (id: string, approvedAmount?: number) =>
    request<Claim>(`/claims/${id}/approve${approvedAmount ? `?approved_amount=${approvedAmount}` : ''}`, { method: 'POST' }),
  rejectClaim: (id: string, reason?: string) =>
    request<Claim>(`/claims/${id}/reject${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`, { method: 'POST' }),
  getClaimStats: () => request<any>('/claims/stats'),

  // Notifications
  getNotifications: (unreadOnly?: boolean) =>
    request<Notification[]>(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
  getUnreadCount: () => request<{ count: number }>('/notifications/count'),
  markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request<any>('/notifications/read-all', { method: 'PUT' }),

  // Audit
  getAuditLogs: (entity_type?: string, entity_id?: string) => {
    const qs = new URLSearchParams();
    if (entity_type) qs.set('entity_type', entity_type);
    if (entity_id) qs.set('entity_id', entity_id);
    return request<AuditLogEntry[]>(`/audit?${qs}`);
  },

  // Activities
  getActivities: (params?: { status?: string; activity_type?: string; days?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.activity_type) qs.set('activity_type', params.activity_type);
    if (params?.days) qs.set('days', String(params.days ?? 30));
    return request<Activity[]>(`/activities?${qs}`);
  },
  createActivity: (data: any) => request<Activity>('/activities', { method: 'POST', body: JSON.stringify(data) }),
  updateActivity: (id: string, data: any) => request<Activity>(`/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getActivityStats: () => request<any>('/activities/stats'),

  // Commissions
  getCommissions: (status?: string) => request<Commission[]>(`/commissions${status ? `?status=${status}` : ''}`),
  createCommission: (data: any) => request<Commission>('/commissions', { method: 'POST', body: JSON.stringify(data) }),
  getCommissionSummary: () => request<any>('/commissions/summary'),

  // Pipeline
  getPipeline: (stage?: string) => request<PipelineDeal[]>(`/pipeline${stage ? `?stage=${stage}` : ''}`),
  createDeal: (data: any) => request<PipelineDeal>('/pipeline', { method: 'POST', body: JSON.stringify(data) }),
  updateDeal: (id: string, data: any) => request<PipelineDeal>(`/pipeline/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeal: (id: string) => request<void>(`/pipeline/${id}`, { method: 'DELETE' }),
  getPipelineSummary: () => request<any>('/pipeline/summary'),

  // Analysis / Proposals / Planning
  analyzeNeeds: (data: any) => request<NeedsAnalysis>('/clients/analyze', { method: 'POST', body: JSON.stringify(data) }),
  generateProposal: (data: any) => request<Proposal>('/proposals/generate', { method: 'POST', body: JSON.stringify(data) }),
  getProposals: (clientId?: string) => request<Proposal[]>(`/proposals${clientId ? `?client_id=${clientId}` : ''}`),
  getMDRTProgress: (year: number, tp?: number, tc?: number) =>
    request<MDRTProgress>('/mdrt/progress', { method: 'POST', body: JSON.stringify({ year, target_premium: tp, target_cases: tc }) }),
  retirementPlan: (data: any) => request<FinancialPlan>('/planning/retirement', { method: 'POST', body: JSON.stringify(data) }),
  educationPlan: (data: any) => request<FinancialPlan>('/planning/education', { method: 'POST', body: JSON.stringify(data) }),
  taxPlan: (data: any) => request<FinancialPlan>('/planning/tax', { method: 'POST', body: JSON.stringify(data) }),

  // AI Assistant
  aiChat: (message: string, channel: string = 'web') =>
    request<AIChatResponse>('/ai/chat', { method: 'POST', body: JSON.stringify({ message, channel }) }),
  getConversations: (limit: number = 50) =>
    request<AIConversationMsg[]>(`/ai/conversations?limit=${limit}`),
  clearConversations: () =>
    request<any>('/ai/conversations', { method: 'DELETE' }),

  // Approvals
  getApprovals: (status?: string) =>
    request<ApprovalItem[]>(`/approvals${status ? `?status=${status}` : ''}`),
  getPendingApprovalCount: () =>
    request<{ count: number }>('/approvals/pending/count'),
  actOnApproval: (id: string, action: 'approve' | 'reject', reason?: string) =>
    request<any>(`/approvals/${id}`, { method: 'POST', body: JSON.stringify({ action, reason }) }),

  // Corporate Solutions
  createCorporateProfile: (data: any) => request<any>('/corporate/profile', { method: 'POST', body: JSON.stringify(data) }),
  getCorporateProfiles: () => request<CorporateProfile[]>('/corporate/profiles'),
  getCorporateProfile: (clientId: string) => request<CorporateProfile>(`/corporate/profile/${clientId}`),
  groupInsuranceCalc: (data: any) => request<any>('/corporate/group-calculate', { method: 'POST', body: JSON.stringify(data) }),
  benefitsCompare: (data: any) => request<any>('/corporate/benefits-compare', { method: 'POST', body: JSON.stringify(data) }),

  // Content Calendar
  getContentPosts: (status?: string, platform?: string) => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (platform) qs.set('platform', platform);
    return request<ContentPost[]>(`/content/posts?${qs}`);
  },
  createContentPost: (data: any) => request<any>('/content/posts', { method: 'POST', body: JSON.stringify(data) }),
  updateContentPost: (id: string, data: any) => request<any>(`/content/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContentPost: (id: string) => request<void>(`/content/posts/${id}`, { method: 'DELETE' }),
  getContentTemplates: (postType?: string, platform?: string) => {
    const qs = new URLSearchParams();
    if (postType) qs.set('post_type', postType);
    if (platform) qs.set('platform', platform);
    return request<any[]>(`/content/templates?${qs}`);
  },
  getContentCalendar: (days?: number) => request<any>(`/content/calendar?days=${days ?? 30}`),

  // Objection Scripts
  getObjections: (category?: string) =>
    request<ObjectionScript[]>(`/content/objections${category ? `?category=${category}` : ''}`),
  createObjection: (data: any) => request<any>('/content/objections', { method: 'POST', body: JSON.stringify(data) }),
  markObjectionUsed: (id: string) => request<any>(`/content/objections/${id}/used`, { method: 'PUT' }),

  // Auto Greetings
  getGreetingTemplates: () => request<any>('/greetings/templates'),
  sendGreeting: (data: any) => request<any>('/greetings/send', { method: 'POST', body: JSON.stringify(data) }),
  getGreetingHistory: (clientId?: string) =>
    request<AutoGreetingItem[]>(`/greetings/history${clientId ? `?client_id=${clientId}` : ''}`),
  getUpcomingEvents: (days?: number) => request<UpcomingEvent[]>(`/greetings/upcoming?days=${days ?? 30}`),

  // Viber Integration
  getViberStatus: () => request<{ configured: boolean; bot_name: string; webhook_url: string | null; user_linked: boolean; viber_user_id: string | null }>('/viber/status'),
  linkViber: (data: { viber_user_id: string; username: string; password: string }) =>
    request<any>('/viber/link', { method: 'POST', body: JSON.stringify(data) }),

  // AI Features
  getPipelineAIInsights: () => request<any>('/pipeline/ai-insights'),
  getUWAIAnalysis: (caseId: string) => request<any>(`/underwriting/${caseId}/ai-analysis`),
  aiGenerateContent: (data: { topic?: string; platform?: string; post_type?: string; language?: string; tone?: string }) =>
    request<any>('/content/ai-generate', { method: 'POST', body: JSON.stringify(data) }),
};
