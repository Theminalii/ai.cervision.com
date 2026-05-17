"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { CrmEmptyState, CrmPageHeader, CrmPagination, CrmPriorityBadge, CrmStatusBadge, CrmToolbar } from "@/components/crm/crm-shared"
import { crmFetch, crmRequest, crmTaskPriorityOptions, crmTaskStatusOptions, crmTaskTypeOptions, formatDate, type CrmApiList, type CrmCustomer, type CrmDeal, type CrmLead, type CrmTask } from "@/lib/crm"

type TaskForm = {
  type: CrmTask["type"]
  title: string
  description: string
  status: CrmTask["status"]
  priority: CrmTask["priority"]
  deadline: string
  customer_id: string
  lead_id: string
  deal_id: string
}

const emptyForm = (): TaskForm => ({
  type: "call",
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  deadline: "",
  customer_id: "none",
  lead_id: "none",
  deal_id: "none",
})

export function CrmTasksPage() {
  const [items, setItems] = useState<CrmTask[]>([])
  const [meta, setMeta] = useState<CrmApiList<CrmTask>["meta"]>()
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [priority, setPriority] = useState("all")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CrmTask | null>(null)
  const [form, setForm] = useState<TaskForm>(emptyForm())
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (currentPage = page) => {
    try {
      setError(null)
      const [tasksRes, customersRes, leadsRes, dealsRes] = await Promise.all([
        crmFetch<CrmApiList<CrmTask>>(`/tasks?per_page=12&page=${currentPage}&search=${encodeURIComponent(search)}&status=${status}&priority=${priority}`),
        crmFetch<CrmApiList<CrmCustomer>>("/customers?per_page=200"),
        crmFetch<CrmApiList<CrmLead>>("/leads?per_page=200"),
        crmFetch<CrmApiList<CrmDeal>>("/deals?per_page=200"),
      ])
      setItems(tasksRes.data ?? [])
      setMeta(tasksRes.meta)
      setCustomers(customersRes.data ?? [])
      setLeads(leadsRes.data ?? [])
      setDeals(dealsRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task-lar yüklənmədi.")
    }
  }, [page, priority, search, status])

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

  const openEdit = (task: CrmTask) => {
    setSelected(task)
    setForm({
      type: task.type,
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      deadline: task.deadline ? task.deadline.slice(0, 16) : "",
      customer_id: task.customer_id ? String(task.customer_id) : "none",
      lead_id: task.lead_id ? String(task.lead_id) : "none",
      deal_id: task.deal_id ? String(task.deal_id) : "none",
    })
    setOpen(true)
  }

  const save = async () => {
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id === "none" ? null : Number(form.customer_id),
        lead_id: form.lead_id === "none" ? null : Number(form.lead_id),
        deal_id: form.deal_id === "none" ? null : Number(form.deal_id),
        deadline: form.deadline || null,
      }
      if (selected) {
        await crmRequest(`/tasks/${selected.id}`, "PUT", payload)
        toast({ title: "Task yeniləndi" })
      } else {
        await crmRequest("/tasks", "POST", payload)
        toast({ title: "Task yaradıldı" })
      }
      setOpen(false)
      await load(1)
      setPage(1)
    } catch (err) {
      toast({ title: "Task saxlanmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const patchStatus = async (task: CrmTask, nextStatus: CrmTask["status"]) => {
    try {
      await crmRequest(`/tasks/${task.id}/status`, "PATCH", { status: nextStatus })
      toast({ title: "Status yeniləndi" })
      await load(page)
    } catch (err) {
      toast({ title: "Status yenilənmədi", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const removeTask = async (task: CrmTask) => {
    if (!window.confirm(`${task.title} silinsin?`)) return
    try {
      await crmRequest(`/tasks/${task.id}`, "DELETE")
      toast({ title: "Task silindi" })
      await load(page)
    } catch (err) {
      toast({ title: "Task silinmədi", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="Tapşırıqlar və Follow-up" description="Zəng, email, görüş, təklif və ödəniş xatırlatmaları üçün mərkəzləşdirilmiş əməliyyat paneli." actions={<Button onClick={openCreate} className="gap-2"><Plus className="size-4" />Yeni task</Button>} />
        <CrmToolbar
          search={search}
          onSearchChange={(value) => { setSearch(value); setPage(1) }}
          filters={
            <>
              <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1) }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün statuslar</SelectItem>
                  {crmTaskStatusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={(value) => { setPriority(value); setPage(1) }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün prioritetlər</SelectItem>
                  {crmTaskPriorityOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          }
        />
        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}
        <Card>
          <CardContent className="p-0">
            {!items.length ? (
              <div className="p-6">
                <CrmEmptyState title="Task yoxdur" description="Follow-up intizamını gücləndirmək üçün ilk CRM task-ınızı yaradın." action={<Button onClick={openCreate}>Task yarat</Button>} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioritet</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Bağlantı</TableHead>
                    <TableHead className="text-right">Əməliyyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.owner?.name ?? "Cari istifadəçi"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell><CrmStatusBadge value={item.status} /></TableCell>
                      <TableCell><CrmPriorityBadge value={item.priority} /></TableCell>
                      <TableCell>{formatDate(item.deadline, { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                      <TableCell>{item.customer?.name ?? item.lead?.title ?? item.deal?.title ?? "Bağlantı yoxdur"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {item.status !== "completed" ? <Button size="sm" variant="outline" onClick={() => void patchStatus(item, "completed")}>Tamamla</Button> : null}
                          <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Redaktə</Button>
                          <Button size="icon" variant="ghost" onClick={() => removeTask(item)}><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <CrmPagination meta={meta} onPageChange={setPage} />
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected ? "Task redaktəsi" : "Yeni task"}</DialogTitle>
            <DialogDescription>Task-lar deal, lead və ya müştəri ilə əlaqələndirilə bilər.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Başlıq</Label><Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Tip</Label>
              <Select value={form.type} onValueChange={(value: TaskForm["type"]) => setForm((prev) => ({ ...prev, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{crmTaskTypeOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value: TaskForm["status"]) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{crmTaskStatusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioritet</Label>
              <Select value={form.priority} onValueChange={(value: TaskForm["priority"]) => setForm((prev) => ({ ...prev, priority: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{crmTaskPriorityOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Deadline</Label><Input type="datetime-local" value={form.deadline} onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))} /></div>
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
            <div className="space-y-2 md:col-span-2"><Label>Açıqlama</Label><Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
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
