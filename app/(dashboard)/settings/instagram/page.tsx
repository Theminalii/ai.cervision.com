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

export default function InstagramSettingsPage() {
  const [draft, setDraft] = useState<any>({})
  const [webhookUrl, setWebhookUrl] = useState("/api/integrations/instagram/webhook")

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void omniFetch<any>("/settings/instagram").then((json) => {
        const row = json.setting
        setWebhookUrl(row?.public_meta?.webhook_url ?? "/api/integrations/instagram/webhook")
        setDraft({
          enabled: row?.enabled ?? false,
          access_token: "",
          business_account_id: row?.public_meta?.business_account_id ?? "",
          app_secret: "",
          verify_token: "",
        })
      }).catch(() => null)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const save = async () => {
    try {
      await omniApi("/settings/instagram", "PUT", draft)
      toast({ title: "Instagram ayarları yadda saxlanıldı" })
    } catch (error) {
      toast({ title: "Instagram ayarı saxlanmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const test = async () => {
    try {
      const json = await omniApi<any>("/integrations/instagram/send-test", "POST")
      toast({ title: json.message ?? "Test sorğusu göndərildi" })
    } catch (error) {
      toast({ title: "Test uğursuz oldu", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Instagram Ayarları</h1>
          <p className="mt-2 text-sm text-muted-foreground">Instagram Messaging API və webhook doğrulama parametrlərini burada saxlayın.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Instagram Messaging</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-2xl border p-4 md:col-span-2"><Label>Instagram aktiv</Label><Switch checked={Boolean(draft.enabled)} onCheckedChange={(value) => setDraft((prev: any) => ({ ...prev, enabled: value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Webhook URL</Label><Input value={webhookUrl} disabled /></div>
            <div className="space-y-2"><Label>Access Token</Label><Input type="password" value={draft.access_token ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, access_token: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Business Account ID</Label><Input value={draft.business_account_id ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, business_account_id: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Meta App Secret</Label><Input type="password" value={draft.app_secret ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, app_secret: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Verify Token</Label><Input type="password" value={draft.verify_token ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, verify_token: e.target.value }))} /></div>
            <div className="md:col-span-2 flex flex-wrap gap-2"><Button onClick={() => void save()}>Save</Button><Button variant="outline" onClick={() => void test()}>Test connection</Button></div>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
