"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { omniApi, omniFetch } from "@/lib/omnichannel"

export default function AiAutomationPage() {
  const [draft, setDraft] = useState<any>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void omniFetch<any>("/settings/ai-automation").then((json) => {
        setDraft({
          ...json.rule,
          blacklist_words_text: (json.rule?.blacklist_words ?? []).join(", "),
        })
      }).catch(() => null)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const save = async () => {
    try {
      await omniApi("/settings/ai-automation", "PUT", {
        ...draft,
        blacklist_words: String(draft.blacklist_words_text ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      })
      toast({ title: "Automation qaydaları yadda saxlanıldı" })
    } catch (error) {
      toast({ title: "Qaydalar saxlanmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  if (!draft) return null

  const boolRow = (key: string, label: string) => (
    <div className="flex items-center justify-between rounded-2xl border p-4" key={key}>
      <Label>{label}</Label>
      <Switch checked={Boolean(draft[key])} onCheckedChange={(value) => setDraft((prev: any) => ({ ...prev, [key]: value }))} />
    </div>
  )

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Avtomatik Cavab Qaydaları</h1>
          <p className="mt-2 text-sm text-muted-foreground">AI cavabının nə vaxt avtomatik göndəriləcəyini, nə vaxt operatora keçəcəyini burada idarə edin.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Automation Rules</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {boolRow("auto_reply_all", "Bütün mesajlara avtomatik cavab ver")}
            {boolRow("work_hours_only", "Yalnız iş saatlarında cavab ver")}
            {boolRow("product_stock_only", "Yalnız məhsul/stok suallarına cavab ver")}
            {boolRow("price_questions", "Qiymət suallarına cavab ver")}
            {boolRow("order_questions", "Sifariş suallarına cavab ver")}
            {boolRow("hide_finance_data", "Borc/maliyyə məlumatını avtomatik gizlət")}
            {boolRow("low_confidence_handoff", "Confidence aşağıdırsa operatora yönləndir")}
            {boolRow("analyze_voice", "Səs mesajını analiz et")}
            {boolRow("analyze_image", "Şəkil mesajını analiz et")}
            {boolRow("create_lead_if_missing", "Müştəri tapılmasa CRM lead yarat")}
            {boolRow("human_handoff_enabled", "İnsan operatora yönləndirmə aktiv olsun")}
            <div className="space-y-2 md:col-span-2">
              <Label>Qara siyahı sözləri</Label>
              <Input value={draft.blacklist_words_text ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, blacklist_words_text: e.target.value }))} placeholder="məhkəmə, şikayət, hüquq..." />
            </div>
            <div className="md:col-span-2"><Button onClick={() => void save()}>Save</Button></div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
