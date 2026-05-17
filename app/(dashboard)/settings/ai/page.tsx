"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { omniApi, omniFetch } from "@/lib/omnichannel"

type Payload = {
  settings: {
    enabled: boolean
    provider: string
    model: string
    daily_limit?: number | null
    monthly_limit?: number | null
    auto_reply_enabled: boolean
    operator_approval_required: boolean
    confidence_min: number
    license_required: boolean
    masked_api_key?: string | null
    masked_token_code?: string | null
  }
  license?: {
    status: string
    monthlyTokenLimit: number
    usedTokens: number
    startDate?: string | null
    endDate?: string | null
  } | null
  usage: {
    monthly_tokens: number
    daily_tokens: number
    failed_requests: number
    auto_replies: number
  }
}

export default function AiSettingsPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [draft, setDraft] = useState<Record<string, string | boolean>>({})

  async function load() {
    const json = await omniFetch<Payload>("/settings/ai")
    setData(json)
    setDraft({
      enabled: json.settings.enabled,
      provider: json.settings.provider,
      api_key: "",
      token_code: "",
      model: json.settings.model,
      daily_limit: String(json.settings.daily_limit ?? ""),
      monthly_limit: String(json.settings.monthly_limit ?? ""),
      auto_reply_enabled: json.settings.auto_reply_enabled,
      operator_approval_required: json.settings.operator_approval_required,
      confidence_min: String(json.settings.confidence_min),
      license_required: json.settings.license_required,
    })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(() => setData(null)) }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const save = async () => {
    try {
      await omniApi("/settings/ai", "PUT", {
        enabled: draft.enabled,
        provider: draft.provider,
        api_key: draft.api_key || undefined,
        token_code: draft.token_code || undefined,
        model: draft.model,
        daily_limit: draft.daily_limit ? Number(draft.daily_limit) : null,
        monthly_limit: draft.monthly_limit ? Number(draft.monthly_limit) : null,
        auto_reply_enabled: draft.auto_reply_enabled,
        operator_approval_required: draft.operator_approval_required,
        confidence_min: Number(draft.confidence_min),
        license_required: draft.license_required,
      })
      toast({ title: "AI ayarları yadda saxlanıldı" })
      await load()
    } catch (error) {
      toast({ title: "Yadda saxlamaq alınmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const testConnection = async () => {
    try {
      const json = await omniApi<{ message: string }>("/settings/ai/test", "POST")
      toast({ title: json.message })
    } catch (error) {
      toast({ title: "Bağlantı testi uğursuz oldu", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const validateToken = async () => {
    try {
      const json = await omniApi<{ message: string }>("/settings/ai/validate-token", "POST", { token_code: draft.token_code })
      toast({ title: json.message })
    } catch (error) {
      toast({ title: "Token etibarsızdır", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Ayarları</h1>
          <p className="mt-2 text-sm text-muted-foreground">OpenAI açarı, token license, usage limit və operator approval qaydalarını burada idarə edin.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Bu ay token</p><p className="mt-2 text-2xl font-semibold">{data?.usage.monthly_tokens ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Bu gün token</p><p className="mt-2 text-2xl font-semibold">{data?.usage.daily_tokens ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Uğursuz AI sorğuları</p><p className="mt-2 text-2xl font-semibold">{data?.usage.failed_requests ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Auto replies</p><p className="mt-2 text-2xl font-semibold">{data?.usage.auto_replies ?? 0}</p></CardContent></Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>OpenAI Provider</CardTitle><CardDescription>API key server-side encrypted saxlanılır və frontend-də yalnız maskalanmış formada görünür.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border p-4 md:col-span-2"><Label>AI aktiv</Label><Switch checked={Boolean(draft.enabled)} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, enabled: value }))} /></div>
              <div className="space-y-2"><Label>Provider</Label><Select value={String(draft.provider ?? "openai")} onValueChange={(value) => setDraft((prev) => ({ ...prev, provider: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="openai">OpenAI</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Model</Label><Input value={String(draft.model ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, model: e.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Maskalanmış açar</Label><Input value={data?.settings.masked_api_key ?? "Yoxdur"} disabled /></div>
              <div className="space-y-2 md:col-span-2"><Label>Yeni OpenAI API key</Label><Input type="password" value={String(draft.api_key ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, api_key: e.target.value }))} placeholder="sk-..." /></div>
              <div className="space-y-2"><Label>Günlük limit</Label><Input type="number" value={String(draft.daily_limit ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, daily_limit: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Aylıq limit</Label><Input type="number" value={String(draft.monthly_limit ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, monthly_limit: e.target.value }))} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Token License və Automation</CardTitle><CardDescription>Aylıq token kodu ilə AI istifadə hüququnu aktivləşdirin.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border p-4 text-sm">
                <p>Status: <span className="font-medium">{data?.license?.status ?? "license yoxdur"}</span></p>
                <p>Limit: {data?.license?.usedTokens ?? 0} / {data?.license?.monthlyTokenLimit ?? 0}</p>
              </div>
              <div className="space-y-2"><Label>Token kodu</Label><Input type="password" value={String(draft.token_code ?? "")} onChange={(e) => setDraft((prev) => ({ ...prev, token_code: e.target.value }))} placeholder="aylıq token kodu" /></div>
              <div className="flex items-center justify-between rounded-2xl border p-4"><Label>License tələb et</Label><Switch checked={Boolean(draft.license_required)} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, license_required: value }))} /></div>
              <div className="flex items-center justify-between rounded-2xl border p-4"><Label>Avtomatik cavab</Label><Switch checked={Boolean(draft.auto_reply_enabled)} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, auto_reply_enabled: value }))} /></div>
              <div className="flex items-center justify-between rounded-2xl border p-4"><Label>Operator təsdiqi</Label><Switch checked={Boolean(draft.operator_approval_required)} onCheckedChange={(value) => setDraft((prev) => ({ ...prev, operator_approval_required: value }))} /></div>
              <div className="space-y-2"><Label>Minimum confidence %</Label><Input type="number" min={1} max={100} value={String(draft.confidence_min ?? "75")} onChange={(e) => setDraft((prev) => ({ ...prev, confidence_min: e.target.value }))} /></div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void testConnection()}>Test AI Connection</Button>
                <Button variant="outline" onClick={() => void validateToken()}>Validate Token</Button>
                <Button onClick={() => void save()}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
