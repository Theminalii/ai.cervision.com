import { backendFetch, ensureBackendToken } from "@/lib/backend-api"

export type OmniConversation = {
  id: number
  channel: "whatsapp" | "instagram" | "gmail"
  customer_name?: string | null
  customer_identifier?: string | null
  status: "new" | "replied" | "pending" | "human_required"
  ai_paused?: boolean
  last_message?: string | null
  last_message_at?: string | null
  assigned_user?: { id: number; name: string } | null
}

export type OmniMessage = {
  id: number
  direction: "incoming" | "outgoing"
  sender_type: "customer" | "ai" | "operator" | "system"
  message_type: "text" | "audio" | "image" | "video" | "file"
  body?: string | null
  status: string
  confidence_score?: number | null
  sent_at?: string | null
  created_at?: string | null
  attachments?: Array<{ id: number; type: string; url?: string | null; mime_type?: string | null }>
}

export type OmniSuggestion = {
  id: number
  reply_text: string
  confidence_score: number
  data_sources?: string[]
  risk_warning?: string | null
  approval_required: boolean
  was_sent: boolean
}

export async function omniFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await ensureBackendToken("bestsol-omnichannel-web")
  const response = await backendFetch(path, token, init)
  return response.json() as Promise<T>
}

export async function omniApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  return omniFetch<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function fmtDate(value?: string | null) {
  if (!value) return "Yoxdur"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("az-AZ", { dateStyle: "medium", timeStyle: "short" }).format(date)
}
