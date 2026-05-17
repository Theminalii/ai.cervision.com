"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CrmEmptyState, CrmPageHeader, CrmStatusBadge, CrmToolbar } from "@/components/crm/crm-shared"
import { crmFetch, crmRequest, formatCurrency, formatDate, type CrmApiList, type CrmCustomer, type CrmDeal, type CrmLead, type CrmPipeline } from "@/lib/crm"

type DealForm = {
  title: string
  customer_id: string
  lead_id: string
  expected_amount: string
  probability: string
  expected_close_date: string
  notes: string
}

const emptyForm = (): DealForm => ({
  title: "",
  customer_id: "none",
  lead_id: "none",
  expected_amount: "",
  probability: "50",
  expected_close_date: "",
  notes: "",
})

export function CrmDealsPage() {
  const [items, setItems] = useState<CrmDeal[]>([])
  const [pipeline, setPipeline] = useState<CrmPipeline | null>(null)
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DealForm>(emptyForm())
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [dealsRes, customersRes, leadsRes] = await Promise.all([
        crmFetch<CrmApiList<CrmDeal>>(`/deals?per_page=100&search=${encodeURIComponent(search)}`),
        crmFetch<CrmApiList<CrmCustomer>>("/customers?per_page=200"),
        crmFetch<CrmApiList<CrmLead>>("/leads?per_page=200"),
      ])
      setItems(dealsRes.data ?? [])
      setPipeline(dealsRes.pipeline ?? null)
      setCustomers(customersRes.data ?? [])
      setLeads(leadsRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deal-lar yüklənmədi.")
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const byStage = useMemo(() => {
    const grouped = new Map<number, CrmDeal[]>()
    for (const stage of pipeline?.stages ?? []) {
      grouped.set(stage.id, [])
    }
    for (const item of items) {
      if (item.stage_id && grouped.has(item.stage_id)) {
        grouped.get(item.stage_id)?.push(item)
      }
    }
    return grouped
  }, [items, pipeline])

  const save = async () => {
    try {
      await crmRequest("/deals", "POST", {
        title: form.title,
        customer_id: form.customer_id === "none" ? null : Number(form.customer_id),
        lead_id: form.lead_id === "none" ? null : Number(form.lead_id),
        expected_amount: form.expected_amount ? Number(form.expected_amount) : 0,
        probability: Number(form.probability || 0),
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || null,
      })
      toast({ title: "Deal yaradıldı" })
      setOpen(false)
      setForm(emptyForm())
      await load()
    } catch (err) {
      toast({ title: "Deal yaradılmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const moveDeal = async (dealId: number, stageId: number) => {
    try {
      const current = items.find((item) => item.id === dealId)
      if (!current || current.stage_id === stageId) {
        return
      }

      await crmRequest(`/deals/${dealId}/stage`, "PATCH", { stage_id: stageId })
      setItems((prev) => prev.map((item) => item.id === dealId ? { ...item, stage_id: stageId, stage: pipeline?.stages.find((stage) => stage.id === stageId) ?? item.stage } : item))
      toast({ title: "Deal mərhələsi yeniləndi" })
    } catch (err) {
      toast({ title: "Stage yenilənmədi", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const removeDeal = async (deal: CrmDeal) => {
    if (!window.confirm(`"${deal.title}" deal-i silinsin?`)) {
      return
    }

    try {
      await crmRequest(`/deals/${deal.id}`, "DELETE")
      setItems((prev) => prev.filter((item) => item.id !== deal.id))
      toast({ title: "Deal silindi" })
    } catch (err) {
      toast({
        title: "Deal silinmədi",
        description: err instanceof Error ? err.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="Deal Pipeline" description="Kanban pipeline ilə satış fürsətlərini mərhələlər üzrə idarə edin. Drag-and-drop ilə mərhələni birbaşa dəyişmək mümkündür." actions={<Button onClick={() => setOpen(true)} className="gap-2"><Plus className="size-4" />Yeni deal</Button>} />
        <CrmToolbar search={search} onSearchChange={setSearch} />
        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}

        {!pipeline?.stages?.length ? (
          <CrmEmptyState title="Pipeline hazır deyil" description="Default CRM pipeline backend tərəfindən ilk istəkdə yaradılır. Səhifəni yenidən yoxlayın." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            {pipeline.stages.sort((a, b) => a.sort_order - b.sort_order).map((stage) => {
              const stageItems = byStage.get(stage.id) ?? []
              return (
                <Card
                  key={stage.id}
                  className="flex min-h-[520px] flex-col rounded-[28px] border-border/70 bg-muted/20"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const raw = event.dataTransfer.getData("text/plain")
                    const dealId = Number(raw)
                    if (dealId) {
                      void moveDeal(dealId, stage.id)
                    }
                    setDraggingId(null)
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{stage.name}</CardTitle>
                      <CardDescription>{stageItems.length} deal</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 p-3 pt-0">
                    <ScrollArea className="h-[420px] pr-3">
                      <div className="space-y-3">
                        {stageItems.length ? stageItems.map((deal) => (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", String(deal.id))
                              setDraggingId(deal.id)
                            }}
                            onDragEnd={() => setDraggingId(null)}
                            className={`rounded-2xl border bg-white p-4 shadow-sm transition ${draggingId === deal.id ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="line-clamp-2 min-w-0 font-medium text-foreground">{deal.title}</p>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => void removeDeal(deal)}
                                >
                                  <Trash2 className="size-4 text-rose-600" />
                                </Button>
                                <GripVertical className="size-4 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="mt-3 space-y-2 text-sm">
                              <p className="truncate text-muted-foreground">{deal.customer?.name ?? deal.lead?.name ?? "Müştəri bağlı deyil"}</p>
                              <p className="font-semibold">{formatCurrency(deal.expected_amount ?? 0)}</p>
                              <p className="text-xs text-muted-foreground">Ehtimal: {deal.probability ?? 0}% • {formatDate(deal.expected_close_date)}</p>
                              {deal.stage ? <CrmStatusBadge value={deal.stage.key} /> : null}
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">Bu mərhələdə deal yoxdur.</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni deal</DialogTitle>
            <DialogDescription>Won mərhələsinə keçəndə sonradan rəsmi satış yaratmaq üçün struktur qorunur.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label>Deal adı</Label><Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Müştəri</Label>
              <Select value={form.customer_id} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Müştəri seçilməyib</SelectItem>
                  {customers.map((customer) => <SelectItem key={customer.id} value={String(customer.id)}>{customer.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead</Label>
              <Select value={form.lead_id} onValueChange={(value) => setForm((prev) => ({ ...prev, lead_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Lead seçilməyib</SelectItem>
                  {leads.map((lead) => <SelectItem key={lead.id} value={String(lead.id)}>{lead.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Gözlənilən məbləğ</Label><Input type="number" value={form.expected_amount} onChange={(e) => setForm((prev) => ({ ...prev, expected_amount: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Probability %</Label><Input type="number" max={100} min={0} value={form.probability} onChange={(e) => setForm((prev) => ({ ...prev, probability: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Expected close date</Label><Input type="date" value={form.expected_close_date} onChange={(e) => setForm((prev) => ({ ...prev, expected_close_date: e.target.value }))} /></div>
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
