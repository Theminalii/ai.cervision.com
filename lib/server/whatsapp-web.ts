import path from "node:path"
import fs from "node:fs"
import QRCode from "qrcode"
import type { Client } from "whatsapp-web.js"
import { API_BASE } from "@/lib/backend-api"

type WhatsAppStatus = "idle" | "initializing" | "qr_required" | "authenticated" | "ready" | "disconnected" | "auth_failure"

type State = {
  client: Client | null
  status: WhatsAppStatus
  qrText: string | null
  qrDataUrl: string | null
  lastError: string | null
  me: string | null
  started: boolean
  lastEventAt: string | null
}

type SerializedWhatsAppMessage = {
  id: string
  body: string
  timestamp: string | null
  fromMe: boolean
  author: string
  type: string
  hasMedia: boolean
}

const globalKey = "__bestsolWhatsappWebState"

function getState(): State {
  const globalStore = globalThis as typeof globalThis & { [globalKey]?: State }
  if (!globalStore[globalKey]) {
    globalStore[globalKey] = {
      client: null,
      status: "idle",
      qrText: null,
      qrDataUrl: null,
      lastError: null,
      me: null,
      started: false,
      lastEventAt: null,
    }
  }

  return globalStore[globalKey]!
}

export async function ensureWhatsAppClient() {
  const state = getState()
  if (state.client) {
    return state
  }

  const authPath = path.join(process.cwd(), ".whatsapp-web-auth")
  fs.mkdirSync(authPath, { recursive: true })

  const { Client, LocalAuth } = await import("whatsapp-web.js")

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: "bestsol-whatsapp-web",
      dataPath: authPath,
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  })

  state.client = client
  bindEvents(client, state)

  return state
}

function toIsoFromUnix(value?: number | null) {
  if (!value) return null
  const millis = value > 1_000_000_000_000 ? value : value * 1000
  const date = new Date(millis)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function extractDigits(value: unknown) {
  const digits = String(value ?? "").replace(/[^\d]/g, "")
  return digits.length >= 7 ? digits : ""
}

function extractPreferredNumber(chat: any) {
  const candidates = [
    chat?.contact?.number,
    chat?.contact?.userid,
    chat?.contact?.id?.user,
    chat?.id?.user,
    String(chat?.id?._serialized ?? "").replace(/@.+$/, ""),
  ]

  for (const candidate of candidates) {
    const digits = extractDigits(candidate)
    if (digits) return digits
  }

  return ""
}

function extractPreferredName(chat: any) {
  return chat?.name
    ?? chat?.formattedTitle
    ?? chat?.contact?.pushname
    ?? chat?.contact?.name
    ?? extractPreferredNumber(chat)
    ?? "WhatsApp chat"
}

async function syncConversationToBackend(payload: {
  externalThreadId: string
  customerName?: string
  customerIdentifier?: string
  customerPhone?: string
  customerUsername?: string
  messages: Array<{
    external_message_id?: string
    body?: string
    direction: "incoming" | "outgoing"
    sender_type: "customer" | "ai" | "operator" | "system"
    message_type?: "text" | "audio" | "image" | "video" | "file"
    status?: string
    sent_at?: string | null
    meta?: Record<string, unknown>
  }>
}) {
  const secret = process.env.APP_AI_LICENSE_SECRET
  if (!secret) {
    return null
  }

  const response = await fetch(`${API_BASE}/omnichannel/internal/whatsapp-sync`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-BESTSOL-INTERNAL-SECRET": secret,
    },
    body: JSON.stringify({
      external_thread_id: payload.externalThreadId,
      customer_name: payload.customerName,
      customer_identifier: payload.customerIdentifier,
      customer_phone: payload.customerPhone,
      customer_username: payload.customerUsername,
      messages: payload.messages,
    }),
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

function bindEvents(client: Client, state: State) {
  client.on("qr", async (qr) => {
    state.status = "qr_required"
    state.qrText = qr
    state.qrDataUrl = await QRCode.toDataURL(qr, {
      margin: 1,
      width: 320,
    })
    state.lastEventAt = new Date().toISOString()
  })

  client.on("authenticated", () => {
    state.status = "authenticated"
    state.lastError = null
    state.lastEventAt = new Date().toISOString()
  })

  client.on("ready", async () => {
    state.status = "ready"
    state.qrText = null
    state.qrDataUrl = null
    try {
      const wid = client.info?.wid?._serialized ?? null
      state.me = wid
    } catch {
      state.me = null
    }
    state.lastEventAt = new Date().toISOString()
  })

  client.on("auth_failure", (message) => {
    state.status = "auth_failure"
    state.lastError = message
    state.lastEventAt = new Date().toISOString()
  })

  client.on("disconnected", (reason) => {
    state.status = "disconnected"
    state.lastError = String(reason)
    state.me = null
    state.lastEventAt = new Date().toISOString()
  })
}

export async function startWhatsAppClient() {
  const state = await ensureWhatsAppClient()
  if (!state.client) {
    throw new Error("WhatsApp client yaradıla bilmədi.")
  }

  if (!state.started) {
    state.started = true
    state.status = "initializing"
    state.lastError = null
    state.lastEventAt = new Date().toISOString()
    void state.client.initialize().catch((error: unknown) => {
      state.status = "disconnected"
      state.started = false
      state.lastError = error instanceof Error ? error.message : "WhatsApp initialize xətası"
      state.lastEventAt = new Date().toISOString()
    })
  }

  return snapshot()
}

export async function disconnectWhatsAppClient() {
  const state = getState()
  if (state.client) {
    try {
      await state.client.destroy()
    } catch {
      // ignore destroy errors and reset local state
    }
  }

  state.client = null
  state.status = "disconnected"
  state.qrText = null
  state.qrDataUrl = null
  state.me = null
  state.started = false
  state.lastEventAt = new Date().toISOString()
}

export async function sendWhatsAppMessage(recipient: string, body: string) {
  const state = await ensureWhatsAppClient()
  if (!state.client) {
    throw new Error("WhatsApp client hazır deyil.")
  }

  if (state.status !== "ready") {
    throw new Error("WhatsApp hələ qoşulmayıb. Əvvəl QR ilə bağlanın.")
  }

  const target = normalizeRecipient(recipient)
  const message = await state.client.sendMessage(target, body)

  return {
    id: message.id?._serialized ?? null,
    to: target,
    body,
    timestamp: message.timestamp ?? null,
  }
}

export async function listWhatsAppChats() {
  const state = await ensureWhatsAppClient()
  if (!state.started) {
    await startWhatsAppClient()
  }

  if (!state.client || state.status !== "ready") {
    return []
  }

  const chats = await (state.client as any).getChats()

  return chats
    .filter((chat: any) => !chat.isStatus)
    .sort((left: any, right: any) => (right.timestamp ?? 0) - (left.timestamp ?? 0))
    .map((chat: any) => ({
      id: chat.id?._serialized ?? "",
      name: extractPreferredName(chat),
      number: extractPreferredNumber(chat),
      lastMessage: chat.lastMessage?.body ?? chat.lastMessage?._data?.caption ?? "",
      lastMessageAt: toIsoFromUnix(chat.timestamp ?? chat.lastMessage?.timestamp ?? null),
      unreadCount: Number(chat.unreadCount ?? 0),
      isGroup: Boolean(chat.isGroup),
    }))
}

export async function listWhatsAppMessages(chatId: string) {
  const state = await ensureWhatsAppClient()
  if (!state.started) {
    await startWhatsAppClient()
  }

  if (!state.client || state.status !== "ready") {
    return []
  }

  const chat = await (state.client as any).getChatById(chatId)
  const messages = await chat.fetchMessages({ limit: 120 })
  const customerPhone = extractPreferredNumber(chat)
  const customerName = extractPreferredName(chat)
  const serializedMessages: SerializedWhatsAppMessage[] = messages.map((message: any) => ({
    id: message.id?._serialized ?? "",
    body: message.body ?? message._data?.caption ?? "",
    timestamp: toIsoFromUnix(message.timestamp ?? null),
    fromMe: Boolean(message.fromMe),
    author: message.fromMe ? "Siz" : customerName,
    type: message.type ?? "text",
    hasMedia: Boolean(message.hasMedia),
  }))

  const synced = await syncConversationToBackend({
    externalThreadId: chat.id?._serialized ?? chatId,
    customerName,
    customerIdentifier: customerPhone || chatId,
    customerPhone: customerPhone || undefined,
    customerUsername: chat.contact?.pushname ?? undefined,
    messages: serializedMessages.map((message: SerializedWhatsAppMessage) => ({
      external_message_id: message.id,
      body: message.body,
      direction: message.fromMe ? "outgoing" : "incoming",
      sender_type: message.fromMe ? "operator" : "customer",
      message_type: (["text", "audio", "image", "video", "file"].includes(message.type) ? message.type : "text") as "text" | "audio" | "image" | "video" | "file",
      status: "received",
      sent_at: message.timestamp ?? null,
      meta: {
        has_media: message.hasMedia,
        source: "whatsapp_web",
      },
    })),
  })

  return {
    chat: {
      id: chat.id?._serialized ?? "",
      name: customerName,
      number: customerPhone || chatId.replace(/@.+$/, ""),
    },
    messages: serializedMessages,
    syncedConversation: synced?.data ?? null,
  }
}

function normalizeRecipient(value: string) {
  if (value.includes("@")) {
    return value
  }

  const digits = value.replace(/[^\d]/g, "")
  if (!digits) {
    throw new Error("Düzgün WhatsApp nömrəsi daxil edin.")
  }

  return `${digits}@c.us`
}

export function snapshot() {
  const state = getState()
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    me: state.me,
    lastError: state.lastError,
    started: state.started,
    lastEventAt: state.lastEventAt,
  }
}
