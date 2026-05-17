"use client"

import { type ReactNode, useCallback, useEffect, useState } from "react"
import { ArrowRightLeft, Building2, CalendarClock, Mail, Phone, Plus, Save, Sparkles, Trash2, UsersRound } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CrmEmptyState, CrmPageHeader, CrmPagination, CrmStatusBadge, CrmToolbar } from "@/components/crm/crm-shared"
import { crmFetch, crmLeadStatusOptions, crmRequest, crmSourceOptions, formatCurrency, formatDate, type CrmApiList, type CrmLead } from "@/lib/crm"
import { cn } from "@/lib/utils"

type LeadForm = {
  title: string
  name: string
  company_name: string
  phone: string
  email: string
  source: CrmLead["source"]
  status: CrmLead["status"]
  expected_value: string
  follow_up_date: string
  lost_reason: string
  notes: string
}

const emptyForm = (): LeadForm => ({
  title: "",
  name: "",
  company_name: "",
  phone: "",
  email: "",
  source: "other",
  status: "new",
  expected_value: "",
  follow_up_date: "",
  lost_reason: "",
  notes: "",
})

const sourceLabelMap = Object.fromEntries(crmSourceOptions.map((item) => [item.value, item.label])) as Record<CrmLead["source"], string>

function getLeadTouchpoint(lead: CrmLead) {
  if (lead.source === "call" || (lead.phone && !lead.email)) {
    return {
      key: "phone",
      label: "Telefon",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    }
  }

  if (lead.source === "walk_in") {
    return {
      key: "meeting",
      label: "Görüş",
      badge: "bg-violet-50 text-violet-700 border-violet-200",
    }
  }

  if (lead.email || lead.source === "website") {
    return {
      key: "mail",
      label: "Mail",
      badge: "bg-sky-50 text-sky-700 border-sky-200",
    }
  }

  return {
    key: "general",
    label: sourceLabelMap[lead.source] ?? "Ümumi",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  }
}

function getSourceBadgeTone(source: CrmLead["source"]) {
  switch (source) {
    case "social_media":
      return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200"
    case "referral":
      return "bg-orange-50 text-orange-700 border-orange-200"
    case "call":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "walk_in":
      return "bg-violet-50 text-violet-700 border-violet-200"
    case "website":
      return "bg-sky-50 text-sky-700 border-sky-200"
    default:
      return "bg-slate-50 text-slate-700 border-slate-200"
  }
}

function LeadSummaryCard({
  title,
  value,
  hint,
  icon,
  className,
}: {
  title: string
  value: number
  hint: string
  icon: ReactNode
  className: string
}) {
  return (
    <Card className={cn("overflow-hidden rounded-[28px] border-0 shadow-[0_18px_50px_rgba(15,23,42,0.18)]", className)}>
      <CardContent className="p-5 text-slate-950">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <div className="rounded-2xl bg-white/55 p-2 text-slate-800">{icon}</div>
        </div>
        <p className="mt-5 text-4xl font-bold leading-none text-slate-950">{value}</p>
        <p className="mt-3 text-sm leading-5 text-slate-800">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function CrmLeadsPage() {
  const [items, setItems] = useState<CrmLead[]>([])
  const [meta, setMeta] = useState<CrmApiList<CrmLead>["meta"]>()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CrmLead | null>(null)
  const [form, setForm] = useState<LeadForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (currentPage = page) => {
    try {
      setError(null)
      const response = await crmFetch<CrmApiList<CrmLead>>(`/leads?per_page=12&page=${currentPage}&search=${encodeURIComponent(search)}&status=${status}`)
      setItems(response.data ?? [])
      setMeta(response.meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lead-lər yüklənmədi.")
    }
  }, [page, search, status])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const openCreate = () => {
    setSelected(null)
    setForm(emptyForm())
    setOpen(true)
  }

  const openEdit = (lead: CrmLead) => {
    setSelected(lead)
    setForm({
      title: lead.title,
      name: lead.name,
      company_name: lead.company_name ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      source: lead.source,
      status: lead.status,
      expected_value: lead.expected_value ? String(lead.expected_value) : "",
      follow_up_date: lead.follow_up_date ? lead.follow_up_date.slice(0, 10) : "",
      lost_reason: lead.lost_reason ?? "",
      notes: lead.notes ?? "",
    })
    setOpen(true)
  }

  const save = async () => {
    try {
      const payload = {
        ...form,
        expected_value: form.expected_value ? Number(form.expected_value) : null,
        follow_up_date: form.follow_up_date || null,
        lost_reason: form.lost_reason || null,
      }

      if (selected) {
        await crmRequest(`/leads/${selected.id}`, "PUT", payload)
        toast({ title: "Lead yeniləndi" })
      } else {
        await crmRequest("/leads", "POST", payload)
        toast({ title: "Lead yaradıldı" })
      }

      setOpen(false)
      await load(1)
      setPage(1)
    } catch (err) {
      toast({ title: "Lead saxlanmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const convertLead = async (lead: CrmLead) => {
    try {
      await crmRequest(`/leads/${lead.id}/convert`, "POST", { target: "both" })
      toast({ title: "Lead müştəri və deal-a çevrildi" })
      await load(page)
    } catch (err) {
      toast({ title: "Çevrilmə alınmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const removeLead = async (lead: CrmLead) => {
    if (!window.confirm(`${lead.title} silinsin?`)) return
    try {
      await crmRequest(`/leads/${lead.id}`, "DELETE")
      toast({ title: "Lead silindi" })
      await load(page)
    } catch (err) {
      toast({ title: "Lead silinmədi", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const totalLeads = meta?.total ?? items.length
  const phoneLeads = items.filter((item) => getLeadTouchpoint(item).key === "phone").length
  const mailLeads = items.filter((item) => getLeadTouchpoint(item).key === "mail").length
  const meetingLeads = items.filter((item) => getLeadTouchpoint(item).key === "meeting").length
  const hotLeads = items.filter((item) => item.score >= 70).length

  return (
    <>
      <Header />
      <main className="space-y-6 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#ffffff_50%,#fbfdff_100%)] p-6">
        <CrmPageHeader title="Lead idarəetməsi" description="Mənbələr, scoring, follow-up tarixi və çevrilmə məntiqi ilə satışa ən yaxın lead-ləri izləyin." actions={<Button onClick={openCreate} className="gap-2"><Plus className="size-4" />Yeni lead</Button>} />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <LeadSummaryCard
            title="Ümumi leadlər"
            value={totalLeads}
            hint="Filtrə uyğun görünən bütün lead axını"
            icon={<UsersRound className="size-5" />}
            className="bg-gradient-to-br from-slate-200 via-slate-100 to-white"
          />
          <LeadSummaryCard
            title="Telefon"
            value={phoneLeads}
            hint="Zəng və ya telefon əsaslı lead-lər"
            icon={<Phone className="size-5" />}
            className="bg-gradient-to-br from-emerald-200 via-emerald-100 to-teal-100"
          />
          <LeadSummaryCard
            title="Mail"
            value={mailLeads}
            hint="Email və website üzərindən gələn lead-lər"
            icon={<Mail className="size-5" />}
            className="bg-gradient-to-br from-sky-200 via-blue-100 to-indigo-100"
          />
          <LeadSummaryCard
            title="Görüş"
            value={meetingLeads}
            hint="Walk-in və üzbəüz əlaqəyə açıq lead-lər"
            icon={<CalendarClock className="size-5" />}
            className="bg-gradient-to-br from-violet-200 via-fuchsia-100 to-pink-100"
          />
          <LeadSummaryCard
            title="İsti leadlər"
            value={hotLeads}
            hint="Skoru 70+ olan prioritet imkanlar"
            icon={<Sparkles className="size-5" />}
            className="bg-gradient-to-br from-amber-200 via-orange-100 to-rose-100"
          />
        </section>

        <CrmToolbar
          search={search}
          onSearchChange={(value) => { setSearch(value); setPage(1) }}
          filters={
            <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                {crmLeadStatusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          }
        />

        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}

        <Card className="overflow-hidden rounded-[30px] border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
          <CardContent className="p-0">
            {!items.length ? (
              <div className="p-6">
                <CrmEmptyState title="Lead yoxdur" description="Lead siyahısını form və ya inteqrasiya ilə doldurub scoring başladın." action={<Button onClick={openCreate}>Lead əlavə et</Button>} />
              </div>
            ) : (
              <>
                <div className="grid gap-4 p-4 lg:hidden">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900">{item.title}</p>
                            <Badge variant="outline" className={cn("capitalize", getSourceBadgeTone(item.source))}>
                              {sourceLabelMap[item.source] ?? item.source}
                            </Badge>
                            <Badge variant="outline" className={getLeadTouchpoint(item).badge}>
                              {getLeadTouchpoint(item).label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><UsersRound className="size-3.5" />{item.name}</span>
                            <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" />{item.company_name ?? "Şirkət göstərilməyib"}</span>
                            {item.phone ? <span className="inline-flex items-center gap-1 break-all"><Phone className="size-3.5" />{item.phone}</span> : null}
                            {item.email ? <span className="inline-flex items-center gap-1 break-all"><Mail className="size-3.5" />{item.email}</span> : null}
                          </div>
                        </div>
                        <CrmStatusBadge value={item.status} />
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Skor</p>
                          <p className="mt-1 font-semibold text-slate-900">{item.score}</p>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                item.score >= 70 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                                  item.score >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-500" :
                                    "bg-gradient-to-r from-rose-400 to-pink-500",
                              )}
                              style={{ width: `${Math.max(8, Math.min(item.score, 100))}%` }}
                            />
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Məbləğ</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatCurrency(item.expected_value ?? 0)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">Follow-up</p>
                          <p className="mt-1 font-semibold text-slate-900">{formatDate(item.follow_up_date)}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Qeyd</p>
                        <p className="mt-1 text-sm text-slate-700">{item.notes ? item.notes.slice(0, 96) : "Follow-up qeydi əlavə edilməyib."}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => convertLead(item)} className="gap-2"><ArrowRightLeft className="size-4" />Çevir</Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)} className="gap-2"><Save className="size-4" />Redaktə</Button>
                        <Button size="sm" variant="ghost" onClick={() => removeLead(item)} className="gap-2 text-rose-600 hover:text-rose-700"><Trash2 className="size-4" />Sil</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Əlaqə kanalı</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Skor</TableHead>
                        <TableHead>Məbləğ</TableHead>
                        <TableHead>Follow-up</TableHead>
                        <TableHead className="text-right">Əməliyyat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-2 py-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900">{item.title}</p>
                                <Badge variant="outline" className={cn("capitalize", getSourceBadgeTone(item.source))}>
                                  {sourceLabelMap[item.source] ?? item.source}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><UsersRound className="size-3.5" />{item.name}</span>
                                <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" />{item.company_name ?? "Şirkət göstərilməyib"}</span>
                                {item.phone ? <span className="inline-flex items-center gap-1"><Phone className="size-3.5" />{item.phone}</span> : null}
                                {item.email ? <span className="inline-flex items-center gap-1"><Mail className="size-3.5" />{item.email}</span> : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge variant="outline" className={getLeadTouchpoint(item).badge}>
                                {getLeadTouchpoint(item).label}
                              </Badge>
                              <p className="max-w-[180px] text-xs text-muted-foreground">
                                {item.phone ? "Telefon mövcuddur." : item.email ? "Mail üzərindən davam etdirilə bilər." : "Ümumi lead kimi izlənir."}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell><CrmStatusBadge value={item.status} /></TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <p className="font-semibold text-slate-900">{item.score}</p>
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    item.score >= 70 ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
                                      item.score >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-500" :
                                        "bg-gradient-to-r from-rose-400 to-pink-500",
                                  )}
                                  style={{ width: `${Math.max(8, Math.min(item.score, 100))}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(item.expected_value ?? 0)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-slate-900">{formatDate(item.follow_up_date)}</p>
                              <p className="text-xs text-muted-foreground">{item.notes ? item.notes.slice(0, 56) : "Follow-up qeydi əlavə edilməyib."}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => convertLead(item)} className="gap-2"><ArrowRightLeft className="size-4" />Çevir</Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Save className="size-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => removeLead(item)}><Trash2 className="size-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <CrmPagination meta={meta} onPageChange={setPage} />
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected ? "Lead redaktəsi" : "Yeni lead"}</DialogTitle>
            <DialogDescription>Lead scoring backend tərəfində avtomatik hesablanır.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Lead adı</Label><Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Kontakt adı</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Şirkət</Label><Input value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Gözlənilən məbləğ</Label><Input type="number" value={form.expected_value} onChange={(e) => setForm((prev) => ({ ...prev, expected_value: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Mənbə</Label>
              <Select value={form.source} onValueChange={(value: LeadForm["source"]) => setForm((prev) => ({ ...prev, source: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {crmSourceOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value: LeadForm["status"]) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {crmLeadStatusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Follow-up tarixi</Label><Input type="date" value={form.follow_up_date} onChange={(e) => setForm((prev) => ({ ...prev, follow_up_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>İtirilmə səbəbi</Label><Input value={form.lost_reason} onChange={(e) => setForm((prev) => ({ ...prev, lost_reason: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Qeyd</Label><Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void save()}>Yadda saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
