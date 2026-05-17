import { backendFetch, ensureBackendToken } from "@/lib/backend-api"

export type CrmMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type CrmApiList<T> = {
  data: T[]
  meta?: CrmMeta
  pipeline?: CrmPipeline
}

export type CrmRecommendation = {
  title: string
  description: string
  reason: string
  impact_level: "low" | "medium" | "high" | "critical"
  recommended_action: string
  expected_result: string
  module: string
  entity?: {
    id?: number
    type?: string
  }
}

export type CrmUserRef = {
  id: number
  name: string
  email?: string | null
}

export type CrmCustomer = {
  id: number
  name: string
  entity_type: "company" | "individual"
  phone: string
  email?: string | null
  address?: string | null
  tax_id?: string | null
  assigned_user_id?: number | null
  assigned_user?: CrmUserRef | null
  company?: { id: number; name: string } | null
  total_debt: number
  status: "active" | "passive"
  crm_status: "lead" | "active" | "inactive" | "vip" | "blocked"
  source?: "website" | "referral" | "social_media" | "call" | "walk_in" | "other" | null
  tags?: string[]
  crm_note?: string | null
  last_contact_at?: string | null
  next_follow_up_at?: string | null
  next_action?: string | null
  lifetime_value?: number
  last_sale_date?: string | null
  sales_count?: number
  created_at?: string | null
}

export type CrmCompany = {
  id: number
  name: string
  tax_id?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  segment?: string | null
  status: "lead" | "active" | "inactive" | "vip" | "blocked"
  address?: string | null
  notes?: string | null
  customer_id?: number | null
  owner_user_id?: number | null
  owner?: CrmUserRef | null
  customer?: CrmCustomer | null
}

export type CrmContact = {
  id: number
  company_id?: number | null
  customer_id?: number | null
  first_name: string
  last_name?: string | null
  job_title?: string | null
  phone?: string | null
  email?: string | null
  social_links?: Record<string, string> | null
  is_primary: boolean
  notes?: string | null
  owner_user_id?: number | null
  owner?: CrmUserRef | null
  company?: CrmCompany | null
  customer?: CrmCustomer | null
}

export type CrmLead = {
  id: number
  owner_user_id?: number | null
  customer_id?: number | null
  company_id?: number | null
  contact_id?: number | null
  title: string
  name: string
  company_name?: string | null
  phone?: string | null
  email?: string | null
  source: "website" | "referral" | "social_media" | "call" | "walk_in" | "other"
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"
  score: number
  expected_value?: number | null
  follow_up_date?: string | null
  lost_reason?: string | null
  notes?: string | null
  owner?: CrmUserRef | null
  customer?: CrmCustomer | null
  company?: CrmCompany | null
  contact?: CrmContact | null
}

export type CrmDealStage = {
  id: number
  pipeline_id: number
  name: string
  key: string
  sort_order: number
  color?: string | null
  is_terminal: boolean
}

export type CrmPipeline = {
  id: number
  name: string
  is_default: boolean
  status: boolean
  stages: CrmDealStage[]
}

export type CrmDeal = {
  id: number
  pipeline_id: number
  stage_id?: number | null
  owner_user_id?: number | null
  customer_id?: number | null
  company_id?: number | null
  contact_id?: number | null
  lead_id?: number | null
  won_sale_id?: number | null
  title: string
  expected_amount?: number | null
  probability?: number | null
  expected_close_date?: string | null
  products?: Array<{ name?: string; quantity?: number; amount?: number }>
  lost_reason?: string | null
  notes?: string | null
  owner?: CrmUserRef | null
  customer?: CrmCustomer | null
  company?: CrmCompany | null
  contact?: CrmContact | null
  lead?: CrmLead | null
  stage?: CrmDealStage | null
  pipeline?: CrmPipeline | null
}

export type CrmTask = {
  id: number
  owner_user_id?: number | null
  customer_id?: number | null
  lead_id?: number | null
  deal_id?: number | null
  type: "call" | "email" | "meeting" | "proposal" | "document" | "payment_reminder"
  title: string
  description?: string | null
  status: "pending" | "in_progress" | "completed" | "overdue"
  priority: "low" | "medium" | "high" | "urgent"
  deadline?: string | null
  completed_at?: string | null
  owner?: CrmUserRef | null
  customer?: CrmCustomer | null
  lead?: CrmLead | null
  deal?: CrmDeal | null
}

export type CrmActivity = {
  id: number
  type: "call" | "meeting" | "email" | "note" | "task" | "sale" | "system"
  title: string
  description?: string | null
  user?: CrmUserRef | null
  customer?: CrmCustomer | null
  lead?: CrmLead | null
  deal?: CrmDeal | null
  task?: CrmTask | null
  company?: CrmCompany | null
  contact?: CrmContact | null
  created_at?: string | null
}

export type CrmOverview = {
  total_customers: number
  active_customers: number
  passive_customers: number
  new_leads: number
  open_deals: number
  closed_deals: number
  won_deals: number
  lost_deals: number
  month_opportunities: number
  expected_revenue: number
  conversion_rate: number
  follow_up_waiting: number
  overdue_tasks: number
  top_customers: CrmCustomer[]
  ai_recommendations: CrmRecommendation[]
}

export type CrmReports = {
  lead_conversion: {
    total: number
    won: number
    lost: number
    qualified: number
  }
  pipeline: Array<{
    stage: string
    count: number
    expected_amount: number
  }>
  employee_performance: Array<{
    owner_user_id: number
    owner_name: string
    deals: number
    won: number
    expected_revenue: number
    tasks: number
  }>
  customer_activity: Array<{
    customer_id: number
    name: string
    last_contact_at?: string | null
    next_follow_up_at?: string | null
    activities: number
    sales_count: number
    lifetime_value: number
  }>
  valuable_customers: CrmCustomer[]
  passive_customers: CrmCustomer[]
  lost_reasons: Array<{ reason: string; count: number }>
  expected_revenue: number
  monthly_performance: Array<{
    month: string
    deals: number
    won_deals: number
    leads: number
  }>
}

export async function crmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await ensureBackendToken("bestsol-crm-web")
  const response = await backendFetch(`/crm${path}`, token, init)
  return response.json() as Promise<T>
}

export async function crmRequest<T>(path: string, method: string, body?: unknown): Promise<T> {
  return crmFetch<T>(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export const crmSourceOptions = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social_media", label: "Sosial media" },
  { value: "call", label: "Zəng" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Digər" },
] as const

export const crmCustomerStatusOptions = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Aktiv" },
  { value: "inactive", label: "Passiv" },
  { value: "vip", label: "VIP" },
  { value: "blocked", label: "Blok" },
] as const

export const crmLeadStatusOptions = [
  { value: "new", label: "Yeni" },
  { value: "contacted", label: "Əlaqə saxlanıb" },
  { value: "qualified", label: "Uyğun" },
  { value: "proposal", label: "Təklif" },
  { value: "won", label: "Qazanılıb" },
  { value: "lost", label: "İtirilib" },
] as const

export const crmTaskTypeOptions = [
  { value: "call", label: "Zəng" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Görüş" },
  { value: "proposal", label: "Təklif hazırla" },
  { value: "document", label: "Sənəd göndər" },
  { value: "payment_reminder", label: "Ödəniş xatırlat" },
] as const

export const crmTaskStatusOptions = [
  { value: "pending", label: "Gözləyir" },
  { value: "in_progress", label: "İcradadır" },
  { value: "completed", label: "Tamamlanıb" },
  { value: "overdue", label: "Gecikib" },
] as const

export const crmTaskPriorityOptions = [
  { value: "low", label: "Aşağı" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksək" },
  { value: "urgent", label: "Təcili" },
] as const

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "Yoxdur"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("az-AZ", options ?? {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function toDatetimeLocalValue(value?: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}
