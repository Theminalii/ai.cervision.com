"use client"

import { type ReactNode } from "react"
import {
  AlertCircle,
  Clock3,
  ImageIcon,
  Instagram,
  Mail,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Target,
  UserRound,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { fmtDate, type OmniConversation, type OmniMessage, type OmniSuggestion } from "@/lib/omnichannel"

export type ChannelKey = "all" | "whatsapp" | "instagram" | "telegram" | "gmail"
export type StatusFilterKey = "all" | "unread" | "human_required" | "ai_replied"

export type DetailData = OmniConversation & {
  messages: OmniMessage[]
  interested_products?: Array<{ id: number; name: string; product_code?: string | null; score?: number }>
  customer?: { id: number; name: string; phone?: string | null; total_debt?: number } | null
  lead?: { id: number; title: string; score?: number } | null
  ai_suggestion?: OmniSuggestion | null
  ai_last_message?: { id: number; body?: string | null; created_at?: string | null } | null
  related_sales?: Array<{ id: number; sale_number: string; total_amount: number; sale_date: string }>
}

export type LiveWhatsAppChat = {
  id: string
  name: string
  number: string
  lastMessage: string
  lastMessageAt?: string | null
  unreadCount: number
  isGroup: boolean
}

export type LiveWhatsAppMessage = {
  id: string
  body: string
  timestamp?: string | null
  fromMe: boolean
  author: string
  type: string
  hasMedia: boolean
}

export const channelButtons = [
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, tone: "bg-emerald-500/12 text-emerald-700 border-emerald-200" },
  { key: "instagram", label: "Instagram", icon: Instagram, tone: "bg-rose-500/12 text-rose-700 border-rose-200" },
  { key: "telegram", label: "Telegram", icon: Send, tone: "bg-sky-500/12 text-sky-700 border-sky-200" },
  { key: "gmail", label: "Gmail", icon: Mail, tone: "bg-orange-500/12 text-orange-700 border-orange-200" },
] as const

const statusFilters: Array<{ key: StatusFilterKey; label: string }> = [
  { key: "all", label: "Hamısı" },
  { key: "unread", label: "Unread" },
  { key: "ai_replied", label: "AI replied" },
  { key: "human_required", label: "Human required" },
]

function getChannelMeta(channel: ChannelKey | OmniConversation["channel"]) {
  return channelButtons.find((item) => item.key === channel) ?? channelButtons[0]
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

function formatCompactTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("az-AZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function ChannelPill({ channel }: { channel: ChannelKey | OmniConversation["channel"] }) {
  const meta = getChannelMeta(channel)
  return (
    <Badge variant="outline" className={cn("rounded-full border px-2.5 py-1 text-[11px] font-medium", meta.tone)}>
      <meta.icon className="mr-1 size-3" />
      {meta.label}
    </Badge>
  )
}

export function IntegrationStatusCard({
  status,
  activeNumber,
  chatCount,
  lastSyncAt,
  onRefresh,
  onManualReply,
}: {
  status?: string | null
  activeNumber?: string | null
  chatCount: number
  lastSyncAt?: string | null
  onRefresh: () => void
  onManualReply: () => void
}) {
  const connected = status === "ready"

  return (
    <div className="flex shrink-0 items-center justify-between rounded-[22px] border border-slate-200 bg-white px-5 py-3 shadow-sm">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">Omnichannel Inbox</h1>
        <p className="truncate text-sm text-slate-500">WhatsApp, Instagram, Telegram və Gmail mesajlarının vahid idarə paneli</p>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        <Badge className={cn("rounded-full border px-3 py-1", connected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
          {connected ? "WhatsApp açıq" : "WhatsApp bağlı"}
        </Badge>
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          {activeNumber || "Qoşulu nömrə yoxdur"}
        </Badge>
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          {chatCount} chat
        </Badge>
        <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
          Son sync: {fmtDate(lastSyncAt)}
        </Badge>
        <Button variant="outline" size="icon" className="rounded-full" onClick={onRefresh}>
          <RefreshCw className="size-4" />
        </Button>
        <Button className="rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={onManualReply}>
          <Send className="mr-2 size-4" />
          Yeni
        </Button>
      </div>
    </div>
  )
}

export function ChannelTabs({
  channel,
  onChange,
}: {
  channel: ChannelKey
  onChange: (value: ChannelKey) => void
}) {
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {channelButtons.map((item) => {
        const Icon = item.icon
        const active = item.key === channel
        return (
          <Button
            key={item.key}
            type="button"
            variant={active ? "default" : "outline"}
            className={cn("rounded-full px-4", active && "bg-emerald-600 text-white hover:bg-emerald-700")}
            onClick={() => onChange(item.key)}
          >
            <Icon className="mr-2 size-4" />
            {item.label}
          </Button>
        )
      })}
      <Button
        type="button"
        variant={channel === "all" ? "default" : "outline"}
        className={cn("rounded-full px-4", channel === "all" && "bg-emerald-600 text-white hover:bg-emerald-700")}
        onClick={() => onChange("all")}
      >
        Hamısı
      </Button>
    </div>
  )
}

export function ConversationItem({
  title,
  subtitle,
  preview,
  timestamp,
  unreadCount,
  channel,
  selected,
  onClick,
  statusLabel,
}: {
  title: string
  subtitle?: string | null
  preview?: string | null
  timestamp?: string | null
  unreadCount?: number
  channel: ChannelKey | OmniConversation["channel"]
  selected: boolean
  onClick: () => void
  statusLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border p-3 text-left transition-all",
        selected
          ? "border-emerald-500/60 bg-[#202c33] shadow-[0_12px_32px_rgba(0,0,0,0.22)] ring-1 ring-emerald-500/20"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5",
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="size-11 border border-white/10">
          <AvatarFallback className="bg-emerald-500/15 text-sm font-semibold text-emerald-200">
            {getInitials(title)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{title}</p>
              <p className="truncate text-xs text-slate-400">{subtitle || "Məlumat yoxdur"}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-[11px]", unreadCount ? "text-emerald-300" : "text-slate-500")}>{formatCompactTime(timestamp)}</p>
              {unreadCount ? (
                <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-300">{preview || "Mesaj yoxdur"}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ChannelPill channel={channel} />
              {statusLabel ? (
                <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-slate-300">
                  {statusLabel}
                </Badge>
              ) : null}
            </div>
            <ChevronRight className="size-4 text-slate-500" />
          </div>
        </div>
      </div>
    </button>
  )
}

function ChevronRight(props: React.ComponentProps<typeof MoreVertical>) {
  return <MoreVertical {...props} />
}

export function ConversationList({
  title,
  description,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  children,
  isLoading,
  emptyState,
}: {
  title: string
  description: string
  search: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilterKey
  onStatusFilterChange: (value: StatusFilterKey) => void
  children: ReactNode
  isLoading?: boolean
  emptyState?: ReactNode
}) {
  return (
    <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-r border-white/10 bg-[#111b21] text-white">
      <div className="sticky top-0 z-10 space-y-4 border-b border-white/10 bg-[#111b21] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight text-white">{title}</h2>
            <p className="text-sm text-slate-400">{description}</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-white/5 hover:text-white">
            <MoreVertical className="size-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Axtarış edin..."
            className="rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              variant={statusFilter === filter.key ? "default" : "outline"}
              className={cn(
                "rounded-full border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white",
                statusFilter === filter.key && "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-600",
              )}
              onClick={() => onStatusFilterChange(filter.key)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-full">
        <div className="space-y-3 p-4">
          {isLoading ? (
            Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="size-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))
          ) : emptyState ? emptyState : children}
        </div>
      </ScrollArea>
    </aside>
  )
}

export function MessageBubble({
  body,
  timestamp,
  author,
  type,
  fromMe,
  mode,
  hasMedia,
}: {
  body?: string | null
  timestamp?: string | null
  author: string
  type: string
  fromMe: boolean
  mode: "live" | "omni"
  hasMedia?: boolean
}) {
  const media = type !== "text" || hasMedia

  return (
    <div className={cn("flex", fromMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-[18px] px-4 py-3 shadow-sm",
          fromMe
            ? "rounded-br-md bg-[#005c4b] text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)]"
            : "rounded-bl-md border border-white/6 bg-[#202c33] text-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.2)]",
        )}
      >
        <div className={cn("mb-2 flex items-center gap-2 text-[11px] font-medium", fromMe ? "text-emerald-100/80" : "text-slate-400")}>
          {fromMe ? <UserRound className="size-3" /> : <Users className="size-3" />}
          <span>{author}</span>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full text-[10px]",
              fromMe ? "border-white/10 bg-white/10 text-emerald-50" : "border-white/10 bg-white/5 text-slate-300",
            )}
          >
            {type}
          </Badge>
        </div>
        {media ? (
          <div className={cn("mb-3 rounded-2xl border p-3", fromMe ? "border-white/10 bg-white/10" : "border-white/10 bg-black/10")}>
            <div className={cn("flex items-center gap-2 text-sm font-medium", fromMe ? "text-white" : "text-slate-100")}>
              {type === "audio" ? <Mic className="size-4" /> : <ImageIcon className="size-4" />}
              {type === "audio" ? "Audio mesaj" : "Media mesaj"}
            </div>
            <p className={cn("mt-2 text-xs", fromMe ? "text-emerald-50/80" : "text-slate-400")}>
              {type === "audio" ? "Audio player və transcription üçün yer" : "Thumbnail və analyze button üçün yer"}
            </p>
          </div>
        ) : null}
        <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{body || "Mesaj yoxdur"}</p>
        <div className={cn("mt-3 flex items-center justify-end gap-2 text-[11px]", fromMe ? "text-emerald-50/75" : "text-slate-400")}>
          <span>{formatCompactTime(timestamp)}</span>
          {mode === "live" && fromMe ? <span>✓✓</span> : null}
        </div>
      </div>
    </div>
  )
}

export function ReplyComposer({
  value,
  onChange,
  onSend,
  onAiSuggest,
  onFocusAiDraft,
  onAttachment,
  disabled,
  showAiActions,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onAiSuggest?: () => void
  onFocusAiDraft?: () => void
  onAttachment?: () => void
  disabled?: boolean
  showAiActions?: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <div className="border-t border-white/10 bg-[#202c33] p-4">
      <div className="flex items-end gap-3">
        <Button type="button" variant="outline" size="icon" className="size-11 rounded-2xl border-white/10 bg-transparent text-slate-200 hover:bg-white/5 hover:text-white" onClick={onAttachment} disabled={disabled}>
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Mesaj yazın..."
          className="min-h-[56px] resize-none rounded-2xl border-white/10 bg-[#2a3942] text-white placeholder:text-slate-400"
          disabled={disabled}
        />
        <div className="flex shrink-0 flex-col gap-2">
          {showAiActions ? (
            <Button type="button" variant="outline" className="rounded-full border-white/10 bg-transparent text-slate-100 hover:bg-white/5" onClick={onAiSuggest} disabled={disabled}>
              <Sparkles className="mr-2 size-4" />
              AI cavab
            </Button>
          ) : null}
          <Button type="button" className="rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={onSend} disabled={disabled}>
            <Send className="mr-2 size-4" />
            Göndər
          </Button>
        </div>
      </div>
      {showAiActions && onFocusAiDraft ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-full border-white/10 bg-transparent text-slate-100 hover:bg-white/5" onClick={onFocusAiDraft}>
            Edit before send
          </Button>
          <Button type="button" variant="outline" className="rounded-full border-white/10 bg-transparent text-slate-100 hover:bg-white/5" disabled>
            <Mic className="mr-2 size-4" />
            Voice analyze
          </Button>
          <Button type="button" variant="outline" className="rounded-full border-white/10 bg-transparent text-slate-100 hover:bg-white/5" disabled>
            <ImageIcon className="mr-2 size-4" />
            Image analyze
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function ChatWindow({
  title,
  subtitle,
  channel,
  statusLabel,
  children,
  composer,
  empty,
  onOpenInsights,
}: {
  title?: string | null
  subtitle?: string | null
  channel: ChannelKey
  statusLabel?: string
  children: ReactNode
  composer: ReactNode
  empty?: boolean
  onOpenInsights?: () => void
}) {
  return (
    <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[#0b141a]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#202c33] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="size-11 border border-white/10">
              <AvatarFallback className="bg-rose-500/15 font-semibold text-rose-200">
                {getInitials(title)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-white">{title || "Yazışma seçin"}</p>
              <p className="truncate text-sm text-slate-300">{subtitle || "Müştəri seçin"}</p>
            </div>
            <ChannelPill channel={channel} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusLabel ? (
            <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-slate-200">
              {statusLabel}
            </Badge>
          ) : null}
          <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:bg-white/5 hover:text-white">
            <Star className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:bg-white/5 hover:text-white">
            <AlertCircle className="size-4" />
          </Button>
          <Button variant="outline" className="rounded-full border-white/10 bg-transparent text-slate-100 hover:bg-white/5 xl:hidden" onClick={onOpenInsights}>
            CRM panel
          </Button>
        </div>
      </div>

      <ScrollArea className="h-full">
        <div className="min-h-full space-y-4 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_22%)] p-5">
          {empty ? (
            <Empty className="min-h-[360px] rounded-2xl border-white/10 bg-white/5">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MessageCircle className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Yazışma seçin</EmptyTitle>
                <EmptyDescription>Soldan bir müştəri seçin ki, mesajlar burada göstərilsin.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : children}
        </div>
      </ScrollArea>

      {composer}
    </section>
  )
}

export function CustomerInfoCard({
  title,
  children,
  description,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-700">{children}</CardContent>
    </Card>
  )
}

export function AiSuggestionCard({
  suggestion,
  onUseDraft,
  onSendAiReply,
}: {
  suggestion?: OmniSuggestion | null
  onUseDraft?: () => void
  onSendAiReply?: () => void
}) {
  return (
    <CustomerInfoCard title="AI Suggested Reply" description="ERP/CRM datasına əsaslanan cavab təklifi">
      {suggestion ? (
        <>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {suggestion.reply_text}
          </div>
          <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
            <div>Confidence: {suggestion.confidence_score}%</div>
            <div>Approval: {suggestion.approval_required ? "Lazımdır" : "Lazım deyil"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestion.data_sources?.map((source) => (
              <Badge key={source} variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-600">
                {source}
              </Badge>
            ))}
          </div>
          {suggestion.risk_warning ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {suggestion.risk_warning}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={onSendAiReply}>
              Send AI Reply
            </Button>
            <Button variant="outline" className="rounded-full" onClick={onUseDraft}>
              Edit before send
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Hələ AI cavab təklifi yaradılmayıb.
        </div>
      )}
    </CustomerInfoCard>
  )
}

export function ActivityTimeline({
  items,
}: {
  items: Array<{ id: string | number; title: string; description?: string | null; timestamp?: string | null; icon?: ReactNode }>
}) {
  return (
    <CustomerInfoCard title="Activity timeline">
      <div className="space-y-4">
        {items.length ? items.map((item, index) => (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                {item.icon ?? <Clock3 className="size-4" />}
              </div>
              {index < items.length - 1 ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <p className="text-sm font-medium text-slate-900">{item.title}</p>
              {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
              <p className="mt-2 text-xs text-slate-400">{fmtDate(item.timestamp)}</p>
            </div>
          </div>
        )) : (
          <p className="text-sm text-slate-500">Timeline məlumatı yoxdur.</p>
        )}
      </div>
    </CustomerInfoCard>
  )
}

export function CustomerInsightPanel({
  title,
  subtitle,
  channel,
  crmStatus,
  customerName,
  customerPhone,
  debtAmount,
  interestedProducts,
  suggestion,
  relatedSales,
  aiLastMessage,
  timeline,
  onUseDraft,
  onSendAiReply,
}: {
  title: string
  subtitle?: string | null
  channel: ChannelKey
  crmStatus?: string | null
  customerName?: string | null
  customerPhone?: string | null
  debtAmount?: number | null
  interestedProducts?: Array<{ id: number; name: string; product_code?: string | null; score?: number }>
  suggestion?: OmniSuggestion | null
  relatedSales?: Array<{ id: number; sale_number: string; total_amount: number; sale_date: string }>
  aiLastMessage?: { body?: string | null; created_at?: string | null } | null
  timeline: Array<{ id: string | number; title: string; description?: string | null; timestamp?: string | null; icon?: ReactNode }>
  onUseDraft?: () => void
  onSendAiReply?: () => void
}) {
  return (
    <div className="space-y-4 bg-[#f8fafc] p-4">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button type="button" className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          CRM
        </button>
        <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500">
          Qeydlər
        </button>
      </div>
      <CustomerInfoCard title="Müştəri Məlumatları">
        <div className="flex items-start gap-3">
          <Avatar className="size-12 border border-slate-200">
            <AvatarFallback className="bg-indigo-100 font-semibold text-indigo-700">
              {getInitials(customerName || title)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-slate-900">{customerName || title}</p>
              <ChannelPill channel={channel} />
            </div>
            <p className="truncate text-sm text-slate-500">{customerPhone || subtitle || "Nömrə yoxdur"}</p>
          </div>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Status</span>
            <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
              {crmStatus || "Aktiv"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Son aktivlik</span>
            <span className="text-slate-900">{fmtDate(timeline[0]?.timestamp)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Kanal</span>
            <span className="text-slate-900">{getChannelMeta(channel).label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Telefon</span>
            <span className="text-slate-900">{customerPhone || "-"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Borc</span>
            <span className="text-slate-900">{debtAmount ?? 0} AZN</span>
          </div>
        </div>
      </CustomerInfoCard>

      <CustomerInfoCard title="Toplanan məlumatlar">
        <p className="text-sm text-slate-600">
          {interestedProducts?.length
            ? `Müştəri əsasən bu məhsullarla maraqlanır: ${interestedProducts.map((product) => product.name).join(", ")}`
            : "Hələ kifayət qədər davranış siqnalı toplanmayıb."}
        </p>
      </CustomerInfoCard>

      <AiSuggestionCard suggestion={suggestion} onUseDraft={onUseDraft} onSendAiReply={onSendAiReply} />

      <CustomerInfoCard title="Qeydlər">
        <Textarea className="min-h-24 rounded-2xl border-slate-200 bg-slate-50" placeholder="Operator qeydi əlavə edin..." />
      </CustomerInfoCard>

      <CustomerInfoCard title="Son sifarişlər">
        {relatedSales?.length ? relatedSales.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
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
      </CustomerInfoCard>

      <CustomerInfoCard title="CRM əməliyyatları">
        <div className="grid gap-2">
          <Button variant="outline" className="justify-start rounded-2xl">
            <Target className="mr-2 size-4" />
            Yeni sifariş
          </Button>
          <Button variant="outline" className="justify-start rounded-2xl">
            <UserRound className="mr-2 size-4" />
            Profil aç
          </Button>
          <Button variant="outline" className="justify-start rounded-2xl">
            <Phone className="mr-2 size-4" />
            Operatora yönləndir
          </Button>
        </div>
      </CustomerInfoCard>

      {aiLastMessage ? (
        <CustomerInfoCard title="Son AI cavabı">
          <p className="text-sm text-slate-700">{aiLastMessage.body || "-"}</p>
          <p className="text-xs text-slate-400">{fmtDate(aiLastMessage.created_at)}</p>
        </CustomerInfoCard>
      ) : null}

      <ActivityTimeline items={timeline} />
    </div>
  )
}

export function CustomerInsightSheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl overflow-y-auto p-0">
        <SheetHeader>
          <SheetTitle>Customer Intelligence</SheetTitle>
        </SheetHeader>
        <div className="p-4">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

export function ErrorState({
  title,
  description,
}: {
  title: string
  description: string
}) {
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

export function LoadingChatWindow() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}>
          <Skeleton className="h-24 w-[72%] rounded-[22px]" />
        </div>
      ))}
    </div>
  )
}
