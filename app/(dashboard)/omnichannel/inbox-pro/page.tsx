"use client"

import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Bot,
  Clock3,
  ImageIcon,
  Instagram,
  Mail,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Send,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { fmtDate, omniApi, omniFetch, type OmniConversation, type OmniMessage, type OmniSuggestion } from "@/lib/omnichannel"
import { cn } from "@/lib/utils"

type ChannelKey = "all" | "whatsapp" | "instagram" | "telegram" | "gmail"
type StatusFilterKey = "all" | "unread" | "human_required" | "ai_replied"

type DetailData = OmniConversation & {
  messages: OmniMessage[]
  interested_products?: Array<{ id: number; name: string; product_code?: string | null; score?: number }>
  customer?: { id: number; name: string; phone?: string | null; total_debt?: number } | null
  ai_suggestion?: OmniSuggestion | null
  ai_last_message?: { id: number; body?: string | null; created_at?: string | null } | null
  related_sales?: Array<{ id: number; sale_number: string; total_amount: number; sale_date: string }>
}

type DetailResponse = { data: DetailData }

type LiveWhatsAppChat = {
  id: string
  name: string
  number: string
  lastMessage: string
  lastMessageAt?: string | null
  unreadCount: number
  isGroup: boolean
}

type LiveWhatsAppMessage = {
  id: string
  body: string
  timestamp?: string | null
  fromMe: boolean
  author: string
  type: string
  hasMedia: boolean
}

type ChannelAvailability = {
  instagram: boolean
  telegram: boolean
}

const channelTabs: Array<{ key: ChannelKey; label: string; icon: typeof MessageCircle; tone: string; activeTone: string }> = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    activeTone: "border-emerald-300 bg-emerald-200 text-emerald-950 hover:bg-emerald-200",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    tone: "border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-orange-50 text-fuchsia-700 hover:from-fuchsia-100 hover:to-orange-100",
    activeTone: "border-fuchsia-200 bg-gradient-to-r from-fuchsia-200 to-orange-200 text-fuchsia-950 hover:from-fuchsia-200 hover:to-orange-200",
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: Send,
    tone: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    activeTone: "border-sky-300 bg-sky-200 text-sky-950 hover:bg-sky-200",
  },
  {
    key: "gmail",
    label: "Gmail",
    icon: Mail,
    tone: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    activeTone: "border-rose-300 bg-rose-200 text-rose-950 hover:bg-rose-200",
  },
  {
    key: "all",
    label: "Hamısı",
    icon: Users,
    tone: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
    activeTone: "border-slate-300 bg-slate-200 text-slate-950 hover:bg-slate-200",
  },
]

const statusFilters: Array<{ key: StatusFilterKey; label: string }> = [
  { key: "all", label: "Hamısı" },
  { key: "unread", label: "Unread" },
  { key: "ai_replied", label: "AI replied" },
  { key: "human_required", label: "Human required" },
]

function digitsOnly(value?: string | null) {
  return String(value ?? "").replace(/[^\d]/g, "")
}

function getInitials(value?: string | null) {
  const text = (value ?? "").trim()
  if (!text) return "?"
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function formatTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("az-AZ", { hour: "2-digit", minute: "2-digit" }).format(date)
}

function getChannelMeta(channel: ChannelKey | OmniConversation["channel"]) {
  return channelTabs.find((item) => item.key === channel) ?? channelTabs[0]
}

function getStatusLabel(status?: string | null) {
  switch (status) {
    case "human_required":
      return "Human required"
    case "replied":
      return "AI replied"
    case "pending":
      return "Gözləmədə"
    case "new":
      return "Yeni"
    case "connected":
      return "Aktiv"
    case "disconnected":
      return "Bağlı"
    default:
      return status || "Aktiv"
  }
}

function getStatusBadgeTone(status?: string | null) {
  switch (status) {
    case "human_required":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "replied":
      return "border-sky-200 bg-sky-50 text-sky-700"
    case "pending":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "disconnected":
      return "border-rose-200 bg-rose-50 text-rose-700"
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
}

function getAvatarTone(seed?: string | null) {
  const value = String(seed ?? "").trim()
  const tones = [
    "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700",
    "bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700",
    "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700",
    "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700",
    "bg-gradient-to-br from-rose-100 to-pink-100 text-rose-700",
  ]
  const score = Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return tones[score % tones.length]
}

function ErrorBox({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="flex h-full min-h-[240px] items-center justify-center p-6 text-center text-sm text-slate-500">{text}</div>
}

function InfoCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function MessageBubble({
  body,
  timestamp,
  author,
  type,
  fromMe,
  hasMedia,
}: {
  body?: string | null
  timestamp?: string | null
  author: string
  type: string
  fromMe: boolean
  hasMedia?: boolean
}) {
  const media = type !== "text" || hasMedia

  return (
    <div className={cn("flex", fromMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-[18px] px-4 py-3 shadow-sm",
          fromMe ? "rounded-br-md bg-[#dcf8c6] text-slate-900" : "rounded-bl-md border border-slate-200 bg-white text-slate-900",
        )}
      >
        {media ? (
          <div className={cn("mb-3 rounded-2xl border p-3", fromMe ? "border-emerald-200 bg-white/70" : "border-slate-200 bg-slate-50")}>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              {type === "audio" ? <Mic className="size-4" /> : <ImageIcon className="size-4" />}
              {type === "audio" ? "Audio mesaj" : "Media mesaj"}
            </div>
            <p className="mt-2 text-xs text-slate-500">Preview / analyze placeholder</p>
          </div>
        ) : null}

        <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-6">{body || "Mesaj yoxdur"}</p>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
          <span className="truncate">{author}</span>
          <span className={cn("shrink-0", fromMe ? "text-emerald-700" : "text-slate-400")}>
            {formatTime(timestamp)} {fromMe ? "✓✓" : ""}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function OmnichannelInboxProPage() {
  const [conversations, setConversations] = useState<OmniConversation[]>([])
  const [whatsAppStatus, setWhatsAppStatus] = useState<any>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<DetailData | null>(null)
  const [reply, setReply] = useState("")
  const [search, setSearch] = useState("")
  const [channel, setChannel] = useState<ChannelKey>("whatsapp")
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all")
  const [liveChats, setLiveChats] = useState<LiveWhatsAppChat[]>([])
  const [liveSelectedId, setLiveSelectedId] = useState<string | null>(null)
  const [liveMessages, setLiveMessages] = useState<LiveWhatsAppMessage[]>([])
  const [liveConversationDetail, setLiveConversationDetail] = useState<DetailData | null>(null)
  const [insightOpen, setInsightOpen] = useState(false)
  const [inboxLoading, setInboxLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [channelAvailability, setChannelAvailability] = useState<ChannelAvailability>({ instagram: false, telegram: false })
  const [channelAvailabilityLoaded, setChannelAvailabilityLoaded] = useState(false)

  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const shouldScrollToBottomRef = useRef(false)

  const loadInbox = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setInboxLoading(true)
      setInboxError(null)
    }
    try {
      const json = await omniFetch<{ data: OmniConversation[] }>("/omnichannel/inbox")
      setConversations(json.data ?? [])
      if (!selectedId && json.data?.[0]?.id) setSelectedId(json.data[0].id)
    } catch (error) {
      if (!silent) {
        setInboxError(error instanceof Error ? error.message : "Inbox yüklənmədi.")
        setConversations([])
      }
    } finally {
      if (!silent) {
        setInboxLoading(false)
      }
    }
  }, [selectedId])

  const loadWhatsAppStatus = useCallback(async () => {
    const json = await fetch("/api/whatsapp-web/status", { cache: "no-store" }).then((res) => res.json())
    setWhatsAppStatus(json)
  }, [])

  const loadChannelAvailability = useCallback(async () => {
    try {
      const instagram = await omniFetch<{ setting?: { enabled?: boolean; public_meta?: { business_account_id?: string | null } } }>("/settings/instagram")
      setChannelAvailability({
        instagram: Boolean(instagram.setting?.enabled && instagram.setting?.public_meta?.business_account_id),
        telegram: false,
      })
    } catch {
      setChannelAvailability({ instagram: false, telegram: false })
    } finally {
      setChannelAvailabilityLoaded(true)
    }
  }, [])

  const loadDetail = useCallback(async (id: number, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setChatLoading(true)
      setChatError(null)
    }
    try {
      const json = await omniFetch<DetailResponse>(`/omnichannel/conversations/${id}`)
      setDetail(json.data)
    } catch (error) {
      if (!silent) {
        setChatError(error instanceof Error ? error.message : "Conversation yüklənmədi.")
        setDetail(null)
      }
    } finally {
      if (!silent) {
        setChatLoading(false)
      }
    }
  }, [])

  const loadLiveChats = useCallback(async (_options?: { silent?: boolean }) => {
    const response = await fetch("/api/whatsapp-web/chats", { cache: "no-store" })
    const json = await response.json()
    if (!response.ok) throw new Error(json?.message ?? "WhatsApp chat-ları alınmadı.")
    setLiveChats(json.data ?? [])
    if (!liveSelectedId && json.data?.[0]?.id) setLiveSelectedId(json.data[0].id)
  }, [liveSelectedId])

  const loadLiveMessages = useCallback(async (chatId: string, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) {
      setChatLoading(true)
      setChatError(null)
    }
    try {
      const response = await fetch(`/api/whatsapp-web/chats/${encodeURIComponent(chatId)}/messages`, { cache: "no-store" })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.message ?? "WhatsApp mesajları alınmadı.")
      setLiveMessages(json.data?.messages ?? [])
      setLiveConversationDetail(json.data?.syncedConversation ?? null)
    } catch (error) {
      if (!silent) {
        setChatError(error instanceof Error ? error.message : "WhatsApp mesajları alınmadı.")
        setLiveMessages([])
        setLiveConversationDetail(null)
      }
    } finally {
      if (!silent) {
        setChatLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInbox()
      void loadWhatsAppStatus().catch(() => setWhatsAppStatus(null))
      void loadChannelAvailability()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadChannelAvailability, loadInbox, loadWhatsAppStatus])

  useEffect(() => {
    if (channel !== "whatsapp") return
    const timer = window.setTimeout(() => {
      setInboxLoading(true)
      setInboxError(null)
      void loadLiveChats().catch((error) => setInboxError(error instanceof Error ? error.message : "WhatsApp chat-ları alınmadı.")).finally(() => setInboxLoading(false))
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [channel, loadLiveChats, loadWhatsAppStatus])

  useEffect(() => {
    if (!selectedId || channel === "whatsapp" || channel === "telegram") return
    if (channel === "instagram" && channelAvailabilityLoaded && !channelAvailability.instagram) return
    const timer = window.setTimeout(() => {
      void loadDetail(selectedId)
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [channel, channelAvailability.instagram, channelAvailabilityLoaded, loadDetail, selectedId])

  useEffect(() => {
    if (channel !== "whatsapp" || !liveSelectedId) return
    const timer = window.setTimeout(() => {
      void loadLiveMessages(liveSelectedId)
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [channel, liveSelectedId, loadLiveMessages])

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return
    const frame = window.requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      } else {
        messageEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" })
      }
      shouldScrollToBottomRef.current = false
    })
    return () => window.cancelAnimationFrame(frame)
  }, [detail?.messages, liveMessages])

  useEffect(() => {
    if (selectedId || liveSelectedId) {
      shouldScrollToBottomRef.current = true
    }
  }, [liveSelectedId, selectedId])

  const matchedStatusForLiveChat = useCallback((chat: LiveWhatsAppChat) => {
    const number = digitsOnly(chat.number)
    return conversations.find((item) => digitsOnly(item.customer_identifier) === number)?.status
  }, [conversations])

  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const hay = `${item.customer_name ?? ""} ${item.customer_identifier ?? ""} ${item.last_message ?? ""}`.toLowerCase()
      const matchesSearch = hay.includes(search.toLowerCase())
      const matchesChannel = channel === "all" ? true : item.channel === channel
      const matchesStatus = statusFilter === "all" ? true : statusFilter === "human_required" ? item.status === "human_required" : statusFilter === "ai_replied" ? item.status === "replied" : false
      return matchesSearch && matchesChannel && matchesStatus
    })
  }, [channel, conversations, search, statusFilter])

  const filteredLiveChats = useMemo(() => {
    return liveChats.filter((item) => {
      const hay = `${item.name} ${item.number} ${item.lastMessage}`.toLowerCase()
      const matchesSearch = hay.includes(search.toLowerCase())
      const matchedStatus = matchedStatusForLiveChat(item)
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "unread"
            ? item.unreadCount > 0
            : statusFilter === "human_required"
              ? matchedStatus === "human_required"
              : statusFilter === "ai_replied"
                ? matchedStatus === "replied"
                : true
      return matchesSearch && matchesStatus
    })
  }, [liveChats, matchedStatusForLiveChat, search, statusFilter])

  const selectedChannelUnavailable =
    (channel === "instagram" && channelAvailabilityLoaded && !channelAvailability.instagram) ||
    (channel === "telegram" && channelAvailabilityLoaded && !channelAvailability.telegram)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (channel === "whatsapp") {
      if (!filteredLiveChats.length) {
        setLiveSelectedId(null)
        setLiveMessages([])
        setLiveConversationDetail(null)
        return
      }
      if (!liveSelectedId || !filteredLiveChats.some((item) => item.id === liveSelectedId)) {
        setLiveSelectedId(filteredLiveChats[0].id)
      }
      return
    }
    if (!filteredConversations.length) {
      setSelectedId(null)
      setDetail(null)
      return
    }
    if (!selectedId || !filteredConversations.some((item) => item.id === selectedId)) {
      setSelectedId(filteredConversations[0].id)
    }
  }, [channel, filteredConversations, filteredLiveChats, liveSelectedId, selectedChannelUnavailable, selectedId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const sendReply = async (sender: "operator" | "ai" = "operator") => {
    if (!reply.trim()) return
    if (channel === "whatsapp") {
      if (!liveSelectedId) return
      try {
        const response = await fetch("/api/whatsapp-web/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: liveSelectedId, body: reply }),
        })
        const json = await response.json()
        if (!response.ok) throw new Error(json?.message ?? "WhatsApp mesajı göndərilmədi.")
        setReply("")
        shouldScrollToBottomRef.current = true
        await loadLiveMessages(liveSelectedId)
        await loadLiveChats()
        toast({ title: "WhatsApp mesajı göndərildi" })
      } catch (error) {
        toast({ title: "WhatsApp cavabı göndərilmədi", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
      }
      return
    }
    if (!selectedId) return
    const isMailReply = detail?.channel === "gmail"
    try {
      await omniApi(`/omnichannel/conversations/${selectedId}/reply`, "POST", { body: reply, sender })
      setReply("")
      shouldScrollToBottomRef.current = true
      await loadDetail(selectedId)
      await loadInbox()
      toast({ title: isMailReply ? "Mail cavabı göndərildi" : "Cavab göndərildi" })
    } catch (error) {
      toast({ title: isMailReply ? "Mail cavabı göndərilmədi" : "Cavab göndərilmədi", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const suggestReply = async () => {
    if (!selectedId) return
    try {
      await omniApi(`/omnichannel/conversations/${selectedId}/ai-suggest`, "POST")
      await loadDetail(selectedId)
      toast({ title: "AI cavab təklifi hazırlandı" })
    } catch (error) {
      toast({ title: "AI təklif yaradılmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const handleSelectLiveChat = async (chatId: string) => {
    shouldScrollToBottomRef.current = true
    setLiveSelectedId(chatId)
    setLiveMessages([])
    setLiveConversationDetail(null)
    setChatError(null)
    await loadLiveMessages(chatId)
  }

  const isWhatsAppChannel = channel === "whatsapp"
  const selectedLiveChat = useMemo(() => filteredLiveChats.find((item) => item.id === liveSelectedId) ?? null, [filteredLiveChats, liveSelectedId])
  const currentDetail = isWhatsAppChannel ? liveConversationDetail : detail
  const currentMessages = isWhatsAppChannel
    ? liveMessages.map((message) => ({
        id: message.id,
        body: message.body,
        timestamp: message.timestamp,
        author: message.author,
        type: message.type,
        fromMe: message.fromMe,
        hasMedia: message.hasMedia,
      }))
    : (detail?.messages ?? []).map((message) => ({
        id: String(message.id),
        body: message.body,
        timestamp: message.created_at ?? message.sent_at,
        author: message.sender_type,
        type: message.message_type,
        fromMe: message.direction === "outgoing",
        hasMedia: Boolean(message.attachments?.length),
      }))

  const selectedDisplayNumber =
    liveConversationDetail?.customer?.phone ??
    liveConversationDetail?.customer_identifier ??
    selectedLiveChat?.number ??
    detail?.customer?.phone ??
    detail?.customer_identifier ??
    "-"

  const selectedTitle =
    (isWhatsAppChannel ? selectedLiveChat?.name : detail?.customer_name) ||
    (isWhatsAppChannel ? selectedLiveChat?.number : detail?.customer_identifier) ||
    "Yazışma seçin"

  const timeline = useMemo(() => {
    if (isWhatsAppChannel) {
      return liveMessages.slice(-6).reverse().map((message) => ({
        id: message.id,
        title: message.fromMe ? "Operator cavabı" : "Müştəri mesajı",
        description: message.body || "Media mesajı",
        timestamp: message.timestamp,
        icon: message.fromMe ? <UserRound className="size-4" /> : <Users className="size-4" />,
      }))
    }
    return (detail?.messages ?? []).slice(-6).reverse().map((message) => ({
      id: message.id,
      title: message.sender_type === "ai" ? "AI cavabı" : message.sender_type === "operator" ? "Operator cavabı" : "Müştəri mesajı",
      description: message.body || "Mesaj yoxdur",
      timestamp: message.created_at ?? message.sent_at,
      icon: message.sender_type === "ai" ? <Bot className="size-4" /> : message.sender_type === "operator" ? <UserRound className="size-4" /> : <Users className="size-4" />,
    }))
  }, [detail?.messages, isWhatsAppChannel, liveMessages])

  const statusCounts = useMemo(() => {
    const sourceCount = isWhatsAppChannel ? filteredLiveChats.length : filteredConversations.length
    const unreadCount = isWhatsAppChannel ? filteredLiveChats.filter((item) => item.unreadCount > 0).length : 0
    const aiRepliedCount = filteredConversations.filter((item) => item.status === "replied").length
    const humanRequiredCount = filteredConversations.filter((item) => item.status === "human_required").length

    return {
      all: sourceCount,
      unread: unreadCount,
      ai_replied: aiRepliedCount,
      human_required: humanRequiredCount,
    }
  }, [filteredConversations, filteredLiveChats, isWhatsAppChannel])

  const insightContent = (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button type="button" className="rounded-xl border-b-2 border-emerald-500 px-4 py-2 text-sm font-medium text-emerald-700">CRM</button>
        <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500">Qeydlər</button>
      </div>

      <InfoCard title="Müştəri Məlumatları">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 border border-slate-200">
            <AvatarFallback className="bg-indigo-100 font-semibold text-indigo-700">{getInitials(currentDetail?.customer?.name ?? selectedTitle)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-slate-900">{currentDetail?.customer?.name ?? selectedTitle}</p>
              <Badge className={cn("rounded-full", getChannelMeta(isWhatsAppChannel ? "whatsapp" : channel).tone)}>
                {getChannelMeta(isWhatsAppChannel ? "whatsapp" : channel).label}
              </Badge>
            </div>
            <p className="truncate text-sm text-slate-500">{selectedDisplayNumber}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><Badge className={cn("rounded-full", getStatusBadgeTone(currentDetail?.status ?? "connected"))}>{getStatusLabel(currentDetail?.status ?? "connected")}</Badge></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">Son aktivlik</span><span className="text-slate-900">{fmtDate(timeline[0]?.timestamp)}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">Kanal</span><span className="text-slate-900">{getChannelMeta(isWhatsAppChannel ? "whatsapp" : channel).label}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">Telefon</span><span className="text-slate-900">{selectedDisplayNumber}</span></div>
        </div>
      </InfoCard>

      <InfoCard title="Əlaqə Məlumatları">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-slate-500">Telefon</span><span className="text-slate-900">{selectedDisplayNumber}</span></div>
          <div className="flex items-center justify-between"><span className="text-slate-500">Email</span><span className="text-slate-900">example@bestsol.az</span></div>
        </div>
      </InfoCard>

      <InfoCard title="Qeydlər" action={<Button variant="ghost" size="sm" className="h-auto px-0 text-slate-500">Edit</Button>}>
        <p className="wrap-anywhere text-sm text-slate-600">
          {currentDetail?.interested_products?.length
            ? `Müştəri bu məhsullarla maraqlanır: ${currentDetail.interested_products.map((item) => item.name).join(", ")}`
            : "VIP müştəri. Kampaniyalardan məlumatlandırmaq."}
        </p>
      </InfoCard>

      <InfoCard title="Son Sifarişlər" action={<Button variant="ghost" size="sm" className="h-auto px-0 text-slate-500">Hamısına bax</Button>}>
        <div className="space-y-3">
          {(currentDetail?.related_sales ?? []).length ? (currentDetail?.related_sales ?? []).slice(0, 3).map((sale) => (
            <div key={sale.id} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{sale.sale_number}</p>
                <p className="text-xs text-slate-500">{fmtDate(sale.sale_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900">{sale.total_amount} AZN</p>
                <Badge className="mt-1 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">Tamamlandı</Badge>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">Son sifariş yoxdur.</p>}
        </div>
      </InfoCard>

      <InfoCard title="CRM Əməliyyatları">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-100" onClick={() => toast({ title: "Yeni sifariş", description: `${selectedTitle} üçün sifariş axını növbəti addımda qoşulacaq.` })}>Yeni sifariş</Button>
          <Button variant="outline" className="h-11 rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-100" onClick={() => toast({ title: "Qeyd əlavə et", description: `${selectedTitle} üçün qeyd modulu ayrıca bağlanacaq.` })}>Qeyd əlavə et</Button>
          <Button variant="outline" className="h-11 rounded-2xl border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-100" onClick={() => toast({ title: "Blokla", description: `${selectedTitle} üçün bloklama təsdiq axını əlavə ediləcək.`, variant: "destructive" })}>Blokla</Button>
        </div>
      </InfoCard>

      <InfoCard title="AI Suggested Reply">
        {currentDetail?.ai_suggestion ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{currentDetail.ai_suggestion.reply_text}</div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-full border border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200" onClick={() => {
                setReply(currentDetail.ai_suggestion?.reply_text ?? "")
                void sendReply("ai")
              }}>Send AI Reply</Button>
              <Button variant="outline" className="rounded-full" onClick={() => {
                setReply(currentDetail.ai_suggestion?.reply_text ?? "")
                composerRef.current?.focus()
              }}>Edit before send</Button>
            </div>
          </div>
        ) : <p className="text-sm text-slate-500">Hələ AI cavab təklifi yoxdur.</p>}
      </InfoCard>
    </div>
  )

  const showDesktopInsights = !selectedChannelUnavailable && ((isWhatsAppChannel && selectedLiveChat) || (!isWhatsAppChannel && detail))
  const hasSelectedConversation = !selectedChannelUnavailable && Boolean((isWhatsAppChannel && selectedLiveChat) || (!isWhatsAppChannel && detail))
  const currentChannelMeta = getChannelMeta(isWhatsAppChannel ? "whatsapp" : channel)
  const isGmailConversation = !isWhatsAppChannel && currentDetail?.channel === "gmail"
  const effectiveInboxError = selectedChannelUnavailable ? null : inboxError
  const effectiveChatError = selectedChannelUnavailable ? null : chatError
  const effectiveChatLoading = selectedChannelUnavailable ? false : chatLoading
  const unavailableChannelText =
    channel === "instagram"
      ? "Instagram inteqrasiyası aktiv deyil. Ayarlarda hesabı qoşduqdan sonra mesajlar burada görünəcək."
      : channel === "telegram"
        ? "Telegram inteqrasiyası hələ başladılmayıb. Sistem qoşulandan sonra yazışmalar burada görünəcək."
        : ""

  useLayoutEffect(() => {
    if (!hasSelectedConversation) return
    const node = messagesContainerRef.current
    if (!node) return
    const timer = window.setTimeout(() => {
      node.scrollTop = node.scrollHeight
    }, 30)
    return () => window.clearTimeout(timer)
  }, [hasSelectedConversation, liveSelectedId, selectedId, currentMessages.length])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f6f8fb] p-4">
        <div className="shrink-0 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">Omnichannel Inbox</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="min-w-[220px]">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Axtarış..."
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 px-4 text-slate-700 shadow-none"
                />
              </div>
              <Button className="rounded-full border border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 active:scale-100" onClick={() => composerRef.current?.focus()}>
                <Send className="mr-2 size-4" />
                Yeni
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div
            className="grid h-full"
            style={{
              minWidth: "860px",
              gridTemplateColumns: "320px minmax(540px, 1fr)",
            }}
          >
            <div className="min-h-0 overflow-hidden border-r border-slate-200 bg-white">
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b border-slate-200 px-4 py-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Conversations</h2>
                  </div>
                  <div className="relative mb-4">
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Axtarış edin..." className="rounded-2xl border-slate-200 bg-slate-50 px-4" />
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {statusFilters.map((filter) => (
                      <Button
                        key={filter.key}
                        type="button"
                        variant="outline"
                        className={cn(
                          "rounded-full border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-100",
                          statusFilter === filter.key && "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
                        )}
                        onClick={() => setStatusFilter(filter.key)}
                      >
                        {filter.label}
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", statusFilter === filter.key ? "bg-white/80 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                          {statusCounts[filter.key]}
                        </span>
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {channelTabs.map((item) => {
                      const Icon = item.icon
                      const active = item.key === channel
                      return (
                        <Button
                          key={item.key}
                          type="button"
                          variant="outline"
                          className={cn("rounded-full active:scale-100", active ? item.activeTone : item.tone)}
                          onClick={() => setChannel(item.key)}
                        >
                          <Icon className="mr-2 size-4" />
                          {item.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {inboxLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="rounded-2xl border border-slate-200 p-3">
                          <div className="flex items-start gap-3">
                            <Skeleton className="size-11 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-28" />
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-3 w-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : effectiveInboxError ? (
                    <ErrorBox title="Conversation list yüklənmədi" description={effectiveInboxError} />
                  ) : selectedChannelUnavailable ? (
                    <EmptyPanel text={unavailableChannelText} />
                  ) : isWhatsAppChannel ? (
                    filteredLiveChats.length ? (
                      <div className="space-y-2">
                        {filteredLiveChats.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void handleSelectLiveChat(item.id)}
                            className={cn(
                              "w-full rounded-3xl border p-3 text-left transition-colors",
                              liveSelectedId === item.id ? "border-emerald-200 bg-emerald-50 shadow-sm" : "border-transparent hover:border-slate-200 hover:bg-slate-50",
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="size-11 border border-slate-200">
                                <AvatarFallback className={cn("font-semibold ring-1 ring-white", getAvatarTone(item.name || item.number))}>{getInitials(item.name || item.number)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900">{item.name || item.number}</p>
                                    <p className="truncate text-xs text-slate-500">{item.number}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={cn("text-[11px]", item.unreadCount ? "text-emerald-600" : "text-slate-400")}>{formatTime(item.lastMessageAt)}</p>
                                    {item.unreadCount ? <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{item.unreadCount}</span> : null}
                                  </div>
                                </div>
                                <p className="mt-2 line-clamp-2 wrap-break-word text-sm text-slate-600">{item.lastMessage || "Mesaj yoxdur"}</p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">WhatsApp</Badge>
                                  {matchedStatusForLiveChat(item) ? (
                                    <Badge className={cn("rounded-full", getStatusBadgeTone(matchedStatusForLiveChat(item)))}>{getStatusLabel(matchedStatusForLiveChat(item))}</Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel text="Uyğun WhatsApp chat tapılmadı." />
                    )
                  ) : filteredConversations.length ? (
                    <div className="space-y-2">
                      {filteredConversations.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            shouldScrollToBottomRef.current = true
                            setSelectedId(item.id)
                          }}
                          className={cn("w-full rounded-3xl border p-3 text-left transition-colors", selectedId === item.id ? "border-emerald-200 bg-emerald-50 shadow-sm" : "border-transparent hover:border-slate-200 hover:bg-slate-50")}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="size-11 border border-slate-200">
                              <AvatarFallback className={cn("font-semibold ring-1 ring-white", getAvatarTone(item.customer_name ?? item.customer_identifier))}>{getInitials(item.customer_name ?? item.customer_identifier)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{item.customer_name ?? "Yeni conversation"}</p>
                                  <p className="truncate text-xs text-slate-500">{item.customer_identifier}</p>
                                </div>
                                <p className="shrink-0 text-[11px] text-slate-400">{formatTime(item.last_message_at)}</p>
                              </div>
                              <p className="mt-2 line-clamp-2 wrap-break-word text-sm text-slate-600">{item.last_message || "Mesaj yoxdur"}</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <Badge className={cn("rounded-full", getChannelMeta(item.channel).tone)}>{getChannelMeta(item.channel).label}</Badge>
                                <Badge className={cn("rounded-full", getStatusBadgeTone(item.status))}>{getStatusLabel(item.status)}</Badge>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel text="Uyğun conversation tapılmadı." />
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0 overflow-hidden bg-[#fbfaf6]">
              <section className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
                  <div className="min-w-0 flex items-center gap-3">
                    <Avatar className="size-11 border border-slate-200">
                      <AvatarFallback className={cn("font-semibold ring-1 ring-white", getAvatarTone(selectedTitle))}>{getInitials(selectedTitle)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold tracking-tight text-slate-900">{hasSelectedConversation ? selectedTitle : selectedChannelUnavailable ? currentChannelMeta.label : "Yazışma seçin"}</p>
                      <p className="truncate text-sm text-slate-500">{hasSelectedConversation ? selectedDisplayNumber : selectedChannelUnavailable ? "Kanal qoşulmayıb" : "Soldan müştəri seçin"}</p>
                    </div>
                    <Badge className={cn("rounded-full", currentChannelMeta.tone)}>{currentChannelMeta.label}</Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:scale-100"
                      onClick={() => {
                        const aiDraft = currentDetail?.ai_suggestion?.reply_text
                        if (aiDraft) {
                          setReply(aiDraft)
                          composerRef.current?.focus()
                          toast({ title: "AI draft hazırdır", description: "Cavab yazı sahəsinə yerləşdirildi." })
                        } else {
                          void suggestReply()
                        }
                      }}
                    >
                      <Sparkles className="mr-2 size-4" />
                      AI-dan təhvil al
                    </Button>
                    <Button variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-100" onClick={() => setInsightOpen(true)}>CRM panel</Button>
                  </div>
                </div>

                <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_20%)] p-5">
                  <div className="mb-4 flex justify-center">
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 shadow-sm">{fmtDate((currentMessages[0]?.timestamp as string | undefined) ?? null)}</span>
                  </div>
                  {selectedChannelUnavailable ? (
                    <EmptyPanel text={unavailableChannelText} />
                  ) : effectiveChatError ? (
                    <ErrorBox title="Mesajlar yüklənmədi" description={effectiveChatError} />
                  ) : effectiveChatLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
                          <Skeleton className="h-24 w-[72%] rounded-[22px]" />
                        </div>
                      ))}
                    </div>
                  ) : hasSelectedConversation && currentMessages.length ? (
                    <div className="space-y-4">
                      {currentMessages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          body={message.body}
                          timestamp={message.timestamp}
                          author={message.author}
                          type={message.type}
                          fromMe={message.fromMe}
                          hasMedia={message.hasMedia}
                        />
                      ))}
                      <div ref={messageEndRef} />
                    </div>
                  ) : (
                    <EmptyPanel text="Soldan müştəri seçin." />
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white p-4">
                  <div className="flex items-end gap-3">
                    <Button type="button" variant="outline" size="icon" className="size-11 rounded-2xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-100" onClick={() => toast({ title: "Attachment UI placeholder", description: "Bu hissə növbəti mərhələdə aktivləşdirilə bilər." })} disabled={!hasSelectedConversation || effectiveChatLoading}>
                      <Paperclip className="size-4" />
                    </Button>
                    <Textarea
                      ref={composerRef}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={isGmailConversation ? "Mail cavabını yazın..." : "Mesaj yazın..."}
                      className="min-h-[56px] resize-none rounded-2xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
                      disabled={!hasSelectedConversation || effectiveChatLoading}
                    />
                    <div className="flex shrink-0 flex-col gap-2">
                      {!isWhatsAppChannel ? (
                        <Button type="button" variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-100" onClick={() => void suggestReply()} disabled={effectiveChatLoading || !detail}>
                          <Sparkles className="mr-2 size-4" />
                          AI cavab
                        </Button>
                      ) : null}
                      <Button type="button" className="rounded-full border border-emerald-200 bg-emerald-100 text-emerald-950 hover:bg-emerald-200 active:scale-100" onClick={() => void sendReply("operator")} disabled={!hasSelectedConversation || effectiveChatLoading}>
                        <Send className="mr-2 size-4" />
                        {isGmailConversation ? "Mail göndər" : "Göndər"}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </div>

        <Sheet open={insightOpen} onOpenChange={setInsightOpen}>
          <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-0">
            <SheetHeader className="border-b border-slate-200 px-6 py-4">
              <SheetTitle>Müştəri Məlumatları</SheetTitle>
            </SheetHeader>
            {showDesktopInsights ? insightContent : <EmptyPanel text="Müştəri məlumatları seçilmiş chat üçün görünəcək." />}
          </SheetContent>
        </Sheet>
    </div>
  )
}
