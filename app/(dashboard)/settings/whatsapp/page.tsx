"use client"

import Image from "next/image"
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

export default function WhatsAppSettingsPage() {
  const [setting, setSetting] = useState<any>(null)
  const [status, setStatus] = useState<any>(null)
  const [draft, setDraft] = useState<any>({})
  const [testRecipient, setTestRecipient] = useState("")
  const [testBody, setTestBody] = useState("Salam, bu BESTSOL ERP WhatsApp test mesajıdır.")

  async function load() {
    const [settingsJson, statusJson] = await Promise.all([
      omniFetch<any>("/settings/whatsapp"),
      fetch("/api/whatsapp-web/status", { cache: "no-store" }).then((res) => res.json()),
    ])
        const row = settingsJson.setting
        setSetting(row)
        setStatus(statusJson)
        setDraft({
          enabled: row?.enabled ?? false,
          connection_type: row?.connection_type ?? "whatsapp_web",
          cloud_access_token: "",
          phone_number_id: "",
          verify_token: "",
        })
      }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(() => null) }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const save = async () => {
    try {
      await omniApi("/settings/whatsapp", "PUT", draft)
      toast({ title: "WhatsApp ayarları yadda saxlanıldı" })
      await load()
    } catch (error) {
      toast({ title: "WhatsApp ayarı saxlanmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const connect = async () => {
    try {
      const json = await fetch("/api/whatsapp-web/connect", {
        method: "POST",
      }).then((res) => res.json())
      setStatus((prev: any) => ({ ...(prev ?? {}), ...json }))
      toast({ title: "QR sessiyası yaradıldı" })
    } catch (error) {
      toast({ title: "Qoşulma alınmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const disconnect = async () => {
    try {
      await fetch("/api/whatsapp-web/disconnect", {
        method: "POST",
      })
      toast({ title: "Bağlantı ayrıldı" })
      await load()
    } catch (error) {
      toast({ title: "Disconnect alınmadı", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const refreshQr = async () => {
    try {
      const json = await fetch("/api/whatsapp-web/qr", { cache: "no-store" }).then((res) => res.json())
      setStatus(json)
    } catch (error) {
      toast({ title: "QR yenilənmədi", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const sendTest = async () => {
    try {
      const json = await fetch("/api/whatsapp-web/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testRecipient, body: testBody }),
      }).then(async (res) => {
        const payload = await res.json()
        if (!res.ok) {
          throw new Error(payload.message ?? "Mesaj göndərilmədi.")
        }
        return payload
      })
      toast({ title: "Test mesajı göndərildi", description: json.data?.to ?? testRecipient })
    } catch (error) {
      toast({ title: "Test mesajı göndərilmədi", description: error instanceof Error ? error.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">WhatsApp Ayarları</h1>
          <p className="mt-2 text-sm text-amber-700">WhatsApp Web rəsmi API deyil və production üçün risklidir. Stabil sistem üçün WhatsApp Business Cloud API tövsiyə olunur.</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Bağlantı</CardTitle><CardDescription>Experimental WhatsApp Web və gələcək Cloud API üçün ortaq struktur.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border p-4"><Label>WhatsApp aktiv</Label><Switch checked={Boolean(draft.enabled)} onCheckedChange={(value) => setDraft((prev: any) => ({ ...prev, enabled: value }))} /></div>
              <div className="space-y-2"><Label>Connection type</Label><Select value={draft.connection_type ?? "whatsapp_web"} onValueChange={(value) => setDraft((prev: any) => ({ ...prev, connection_type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="whatsapp_web">WhatsApp Web experimental</SelectItem><SelectItem value="whatsapp_cloud">WhatsApp Cloud API</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Cloud Access Token</Label><Input type="password" value={draft.cloud_access_token ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, cloud_access_token: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone Number ID</Label><Input value={draft.phone_number_id ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, phone_number_id: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Verify Token</Label><Input type="password" value={draft.verify_token ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, verify_token: e.target.value }))} /></div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void save()}>Save</Button>
                <Button variant="outline" onClick={() => void connect()}>QR Connect</Button>
                <Button variant="outline" onClick={() => void refreshQr()}>QR Refresh</Button>
                <Button variant="outline" onClick={() => void disconnect()}>Disconnect</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Session Status</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>Status: <span className="font-medium">{status?.status ?? "disconnected"}</span></p>
              <p>Aktiv nömrə: <span className="font-medium">{status?.me ? String(status.me).replace("@c.us", "") : "Qoşulu nömrə yoxdur"}</span></p>
              <p>Client ID: {status?.me ?? "-"}</p>
              <p>Son event: {status?.lastEventAt ?? "-"}</p>
              {status?.lastError ? <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-700">{status.lastError}</div> : null}
              {status?.qrDataUrl ? (
                <div className="space-y-2">
                  <p className="font-medium">QR kodu oxudun</p>
                  <Image src={status.qrDataUrl} alt="WhatsApp QR" width={320} height={320} className="rounded-2xl border bg-white p-2" unoptimized />
                </div>
              ) : (
                <div className="rounded-2xl border bg-muted/20 p-4">QR hələ yaradılmayıb və ya artıq scan olunub.</div>
              )}
              <div className="rounded-2xl border bg-muted/20 p-4 break-all">{status?.warning ?? "Warning yoxdur"}</div>
              <div className="space-y-3 border-t pt-4">
                <p className="font-medium">Test mesaj göndər</p>
                <div className="space-y-2">
                  <Label>Nömrə</Label>
                  <Input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="994..." />
                </div>
                <div className="space-y-2">
                  <Label>Mesaj</Label>
                  <Input value={testBody} onChange={(e) => setTestBody(e.target.value)} />
                </div>
                <Button onClick={() => void sendTest()}>Test message send</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
