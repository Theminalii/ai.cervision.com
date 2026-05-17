"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { omniApi, omniFetch } from "@/lib/omnichannel"

export default function GmailSettingsPage() {
  const [credentialStatus, setCredentialStatus] = useState({ username: false, password: false })
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string>("")
  const [lastSyncStatus, setLastSyncStatus] = useState<string>("")
  const [draft, setDraft] = useState<any>({
    enabled: false,
    email_address: "",
    from_name: "BESTSOL",
    imap_host: "",
    imap_port: 993,
    imap_encryption: "ssl",
    smtp_host: "",
    smtp_port: 465,
    smtp_encryption: "ssl",
    username: "",
    password: "",
    auto_reply_enabled: false,
    operator_approval_required: true,
    sync_interval_minutes: 5,
    monitored_folders: ["INBOX"],
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void omniFetch<any>("/settings/gmail")
        .then((json) => {
          const row = json.setting
          const meta = row?.public_meta ?? {}
          setCredentialStatus({
            username: Boolean(row?.has_credentials?.username),
            password: Boolean(row?.has_credentials?.password),
          })
          setLastSyncAt(meta.last_sync_run_at ?? "")
          setLastSyncStatus(meta.last_sync_status ?? "")
          setDraft((prev: any) => ({
            ...prev,
            enabled: row?.enabled ?? false,
            email_address: meta.email_address ?? "",
            from_name: meta.from_name ?? "BESTSOL",
            imap_host: meta.imap_host ?? "",
            imap_port: meta.imap_port ?? 993,
            imap_encryption: meta.imap_encryption ?? "ssl",
            smtp_host: meta.smtp_host ?? "",
            smtp_port: meta.smtp_port ?? 465,
            smtp_encryption: meta.smtp_encryption ?? "ssl",
            auto_reply_enabled: meta.auto_reply_enabled ?? false,
            operator_approval_required: meta.operator_approval_required ?? true,
            sync_interval_minutes: meta.sync_interval_minutes ?? 5,
            monitored_folders: meta.monitored_folders ?? ["INBOX"],
          }))
        })
        .catch(() => null)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const save = async () => {
    try {
      const response = await omniApi<any>("/settings/gmail", "PUT", draft)
      setCredentialStatus({
        username: credentialStatus.username || Boolean(String(draft.username ?? "").trim()),
        password: credentialStatus.password || Boolean(String(draft.password ?? "").trim()),
      })
      toast({
        title: response.message ?? "Mail ayarları saxlanıldı",
        description: "Mail idarəetməsi üçün konfiqurasiya yadda saxlanıldı.",
      })
    } catch (error) {
      toast({
        title: "Mail ayarı saxlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const syncNow = async () => {
    try {
      setSyncing(true)
      const response = await omniApi<any>("/settings/gmail/sync", "POST", { limit: 20 })
      setLastSyncAt(new Date().toISOString())
      setLastSyncStatus("ok")
      toast({
        title: response.message ?? "Mail sync tamamlandı",
        description: `${response.data?.messages ?? 0} mesaj, ${response.data?.conversations ?? 0} conversation sync edildi.`,
      })
    } catch (error) {
      toast({
        title: "Mail sync alınmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_22%),linear-gradient(180deg,#fffdf7_0%,#f7fbff_55%,#ffffff_100%)] p-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">Mail idarəetmə</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Korporativ Mail Ayarları</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Burada öz korporativ mailini əlavə edə bilərsən. Məqsəd odur ki, gələn məktublar da sonradan omnichannel inbox-a WhatsApp kimi düşsün və AI müəyyən məktublara avtomatik cavab hazırlaya bilsin.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button size="lg" variant="outline" className="rounded-2xl px-6" onClick={() => void syncNow()} disabled={syncing}>
              {syncing ? "Sync gedir..." : "İndi sync et"}
            </Button>
            <Button size="lg" className="rounded-2xl bg-blue-600 px-6 text-white hover:bg-blue-700" onClick={() => void save()}>
              Yadda saxla
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.88fr]">
          <Card className="border-blue-100 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardTitle>IMAP / SMTP Konfiqurasiyası</CardTitle>
              <CardDescription>Incoming üçün IMAP, göndərmə üçün SMTP ayarlarını daxil et.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 md:col-span-2">
                <Label>Mail inteqrasiyasını aktiv et</Label>
                <Switch checked={Boolean(draft.enabled)} onCheckedChange={(value) => setDraft((prev: any) => ({ ...prev, enabled: value }))} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <p className="text-sm font-medium text-slate-900">Yadda saxlanan credential statusu</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className={credentialStatus.username ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"}>
                    Username {credentialStatus.username ? "var" : "yoxdur"}
                  </Badge>
                  <Badge className={credentialStatus.password ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"}>
                    Password {credentialStatus.password ? "var" : "yoxdur"}
                  </Badge>
                  <Badge className={lastSyncStatus === "ok" ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-700"}>
                    Auto sync {lastSyncStatus === "ok" ? "aktiv" : "gözləmədə"}
                  </Badge>
                </div>
                {lastSyncAt ? <p className="mt-3 text-xs text-slate-500">Son sync: {new Date(lastSyncAt).toLocaleString("az-AZ")}</p> : null}
              </div>

              <div className="space-y-2">
                <Label>Mail address</Label>
                <Input value={draft.email_address ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, email_address: e.target.value }))} placeholder="sales@yourcompany.az" />
              </div>
              <div className="space-y-2">
                <Label>From name</Label>
                <Input value={draft.from_name ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, from_name: e.target.value }))} placeholder="BESTSOL Sales" />
              </div>

              <div className="space-y-2">
                <Label>IMAP host</Label>
                <Input value={draft.imap_host ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, imap_host: e.target.value }))} placeholder="imap.yourcompany.az" />
              </div>
              <div className="space-y-2">
                <Label>IMAP port</Label>
                <Input type="number" value={draft.imap_port ?? 993} onChange={(e) => setDraft((prev: any) => ({ ...prev, imap_port: Number(e.target.value) || 993 }))} />
              </div>

              <div className="space-y-2">
                <Label>IMAP encryption</Label>
                <Select value={draft.imap_encryption ?? "ssl"} onValueChange={(value) => setDraft((prev: any) => ({ ...prev, imap_encryption: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="none">Yoxdur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={draft.username ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, username: e.target.value }))} placeholder="Tam login username" />
                <p className="text-xs text-slate-500">Boş saxlasan əvvəlki username qorunacaq.</p>
              </div>

              <div className="space-y-2">
                <Label>SMTP host</Label>
                <Input value={draft.smtp_host ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, smtp_host: e.target.value }))} placeholder="smtp.yourcompany.az" />
              </div>
              <div className="space-y-2">
                <Label>SMTP port</Label>
                <Input type="number" value={draft.smtp_port ?? 465} onChange={(e) => setDraft((prev: any) => ({ ...prev, smtp_port: Number(e.target.value) || 465 }))} />
              </div>

              <div className="space-y-2">
                <Label>SMTP encryption</Label>
                <Select value={draft.smtp_encryption ?? "ssl"} onValueChange={(value) => setDraft((prev: any) => ({ ...prev, smtp_encryption: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                    <SelectItem value="none">Yoxdur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Password / App Password</Label>
                <Input type="password" value={draft.password ?? ""} onChange={(e) => setDraft((prev: any) => ({ ...prev, password: e.target.value }))} placeholder="Mail app password" />
                <p className="text-xs text-slate-500">Boş saxlasan əvvəlki şifrə silinməyəcək, olduğu kimi qalacaq.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Monitored folders</Label>
                <Input
                  value={Array.isArray(draft.monitored_folders) ? draft.monitored_folders.join(", ") : "INBOX"}
                  onChange={(e) => setDraft((prev: any) => ({ ...prev, monitored_folders: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) }))}
                  placeholder="INBOX, Sales, Support"
                />
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <Button size="lg" className="rounded-2xl bg-blue-600 px-6 text-white hover:bg-blue-700" onClick={() => void save()}>Yadda saxla</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-100 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <CardTitle>AI və Sync Davranışı</CardTitle>
              <CardDescription>Mail inbox gələcəkdə omnichannel inbox ilə eyni axında işləsin deyə əsas qaydaları burada qur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">AI auto-reply</p>
                  <p className="text-sm text-slate-500">Müəyyən məktublar üçün AI avtomatik draft hazırlasın</p>
                </div>
                <Switch checked={Boolean(draft.auto_reply_enabled)} onCheckedChange={(value) => setDraft((prev: any) => ({ ...prev, auto_reply_enabled: value }))} />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">Operator approval</p>
                  <p className="text-sm text-slate-500">Göndərmədən əvvəl operator təsdiqi istə</p>
                </div>
                <Switch checked={Boolean(draft.operator_approval_required)} onCheckedChange={(value) => setDraft((prev: any) => ({ ...prev, operator_approval_required: value }))} />
              </div>

              <div className="space-y-2">
                <Label>Sync interval (dəqiqə)</Label>
                <Input type="number" value={draft.sync_interval_minutes ?? 5} onChange={(e) => setDraft((prev: any) => ({ ...prev, sync_interval_minutes: Number(e.target.value) || 5 }))} />
              </div>

              <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 text-sm leading-6 text-slate-600">
                Bu səhifə artıq təkcə ayar saxlamır.
                Mail-lər avtomatik olaraq hər 1 dəqiqədən bir sync olunmağa çalışır.
                `İndi sync et` ilə bunu əl ilə də tetikləyə bilərsən; IMAP-dan mail-lər çəkilir, omnichannel inbox-a `Gmail` conversation kimi düşür və operator cavabı SMTP üzərindən geri göndərilə bilir.
              </div>

              <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 text-sm leading-6 text-slate-600">
                Tövsiyə:
                `IMAP` üçün ayrıca app password istifadə et.
                `SMTP` və `IMAP` host-ları mail provayderinin sənədindən götür.
                Auto-reply-ni yalnız operator approval ilə açmaq daha təhlükəsizdir.
              </div>

              <div className="sticky bottom-0 -mx-1 rounded-[22px] border border-blue-100 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur">
                <Button size="lg" className="w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700" onClick={() => void save()}>
                  Yadda saxla
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
