"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CrmEmptyState, CrmPageHeader, CrmPagination, CrmStatusBadge, CrmToolbar } from "@/components/crm/crm-shared"
import { crmFetch, crmRequest, formatDate, type CrmActivity, type CrmApiList, type CrmCustomer, type CrmDeal, type CrmLead, type CrmTask } from "@/lib/crm"

type ActivityForm = {
  type: CrmActivity["type"]
  title: string
  description: string
  customer_id: string
  lead_id: string
  deal_id: string
  task_id: string
}

const emptyForm = (): ActivityForm => ({
  type: "note",
  title: "",
  description: "",
  customer_id: "none",
  lead_id: "none",
  deal_id: "none",
  task_id: "none",
})

export function CrmActivitiesPage() {
  const [items, setItems] = useState<CrmActivity[]>([])
  const [meta, setMeta] = useState<CrmApiList<CrmActivity>["meta"]>()
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ActivityForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (currentPage = page) => {
    try {
      setError(null)
      const [activitiesRes, customersRes, leadsRes, dealsRes, tasksRes] = await Promise.all([
        crmFetch<CrmApiList<CrmActivity>>(`/activities?per_page=12&page=${currentPage}&type=${type}`),
        crmFetch<CrmApiList<CrmCustomer>>("/customers?per_page=200"),
        crmFetch<CrmApiList<CrmLead>>("/leads?per_page=200"),
        crmFetch<CrmApiList<CrmDeal>>("/deals?per_page=200"),
        crmFetch<CrmApiList<CrmTask>>("/tasks?per_page=200"),
      ])
      setItems((activitiesRes.data ?? []).filter((item) => !search || `${item.title} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase())))
      setMeta(activitiesRes.meta)
      setCustomers(customersRes.data ?? [])
      setLeads(leadsRes.data ?? [])
      setDeals(dealsRes.data ?? [])
      setTasks(tasksRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fəaliyyətlər yüklənmədi.")
    }
  }, [page, search, type])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const save = async () => {
    try {
      await crmRequest("/activities", "POST", {
        ...form,
        customer_id: form.customer_id === "none" ? null : Number(form.customer_id),
        lead_id: form.lead_id === "none" ? null : Number(form.lead_id),
        deal_id: form.deal_id === "none" ? null : Number(form.deal_id),
        task_id: form.task_id === "none" ? null : Number(form.task_id),
      })
      toast({ title: "Fəaliyyət əlavə olundu" })
      setOpen(false)
      setForm(emptyForm())
      await load(1)
      setPage(1)
    } catch (err) {
      toast({ title: "Fəaliyyət yaradılmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="CRM Fəaliyyətləri" description="Zəng, görüş, note, email və task tarixçəsini vahid timeline kimi izləyin." actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="size-4" />Yeni fəaliyyət</Button>} />
        <CrmToolbar
          search={search}
          onSearchChange={(value) => { setSearch(value); setPage(1) }}
          filters={
            <Select value={type} onValueChange={(value) => { setType(value); setPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün tiplər</SelectItem>
                {["call", "meeting", "email", "note", "task", "sale", "system"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          }
        />
        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}
        {!items.length ? (
          <CrmEmptyState title="Fəaliyyət yoxdur" description="Timeline boşdur. İlk CRM qeydini yaradın." action={<Button onClick={() => setOpen(true)}>Fəaliyyət əlavə et</Button>} />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex gap-4 p-5">
                  <div className="mt-1 h-3 w-3 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.user?.name ?? "Sistem"} • {formatDate(item.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                      <CrmStatusBadge value={item.type} />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description ?? "Əlavə təsvir yoxdur."}</p>
                    <p className="text-xs text-muted-foreground">{item.customer?.name ?? item.lead?.title ?? item.deal?.title ?? item.task?.title ?? "Ümumi CRM fəaliyyəti"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <CrmPagination meta={meta} onPageChange={setPage} />
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Yeni fəaliyyət</DialogTitle>
            <DialogDescription>Timeline qeydi müştəri, lead, deal və ya task ilə əlaqələndirilə bilər.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tip</Label>
              <Select value={form.type} onValueChange={(value: ActivityForm["type"]) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["call", "meeting", "email", "note", "task", "sale", "system"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Başlıq</Label><Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Müştəri</Label>
              <Select value={form.customer_id} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Müştəri yoxdur</SelectItem>{customers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={form.lead_id} onValueChange={(value) => setForm((prev) => ({ ...prev, lead_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Lead yoxdur</SelectItem>{leads.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deal</Label>
              <Select value={form.deal_id} onValueChange={(value) => setForm((prev) => ({ ...prev, deal_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Deal yoxdur</SelectItem>{deals.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task</Label>
              <Select value={form.task_id} onValueChange={(value) => setForm((prev) => ({ ...prev, task_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Task yoxdur</SelectItem>{tasks.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Təsvir</Label><Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
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
