"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Eye, Plus, Save, Star, Trash2 } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  crmCustomerStatusOptions,
  crmFetch,
  crmRequest,
  crmSourceOptions,
  formatCurrency,
  formatDate,
  type CrmApiList,
  type CrmCompany,
  type CrmCustomer,
} from "@/lib/crm"
import { CrmEmptyState, CrmPageHeader, CrmPagination, CrmStatusBadge, CrmToolbar } from "@/components/crm/crm-shared"

type CustomerForm = {
  name: string
  entity_type: "company" | "individual"
  phone: string
  email: string
  address: string
  tax_id: string
  company_id: string
  crm_status: CrmCustomer["crm_status"]
  source: NonNullable<CrmCustomer["source"]>
  tags: string
  crm_note: string
  next_action: string
  next_follow_up_at: string
  status: CrmCustomer["status"]
}

const emptyForm = (): CustomerForm => ({
  name: "",
  entity_type: "individual",
  phone: "",
  email: "",
  address: "",
  tax_id: "",
  company_id: "none",
  crm_status: "active",
  source: "other",
  tags: "",
  crm_note: "",
  next_action: "",
  next_follow_up_at: "",
  status: "active",
})

export function CrmCustomersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CrmCustomer[]>([])
  const [meta, setMeta] = useState<CrmApiList<CrmCustomer>["meta"]>()
  const [companies, setCompanies] = useState<CrmCompany[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CrmCustomer | null>(null)
  const [form, setForm] = useState<CustomerForm>(emptyForm())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (currentPage = page) => {
    setLoading(true)
    setError(null)
    try {
      const [customersRes, companiesRes] = await Promise.all([
        crmFetch<CrmApiList<CrmCustomer>>(`/customers?per_page=12&page=${currentPage}&search=${encodeURIComponent(search)}&crm_status=${status}`),
        crmFetch<CrmApiList<CrmCompany>>("/companies?per_page=200"),
      ])

      setItems(customersRes.data ?? [])
      setMeta(customersRes.meta)
      setCompanies(companiesRes.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "CRM müştəriləri yüklənmədi.")
    } finally {
      setLoading(false)
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

  const openEdit = (customer: CrmCustomer) => {
    setSelected(customer)
    setForm({
      name: customer.name,
      entity_type: customer.entity_type,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? "",
      tax_id: customer.tax_id ?? "",
      company_id: customer.company?.id ? String(customer.company.id) : "none",
      crm_status: customer.crm_status,
      source: customer.source ?? "other",
      tags: (customer.tags ?? []).join(", "),
      crm_note: customer.crm_note ?? "",
      next_action: customer.next_action ?? "",
      next_follow_up_at: customer.next_follow_up_at ? customer.next_follow_up_at.slice(0, 16) : "",
      status: customer.status,
    })
    setOpen(true)
  }

  const onSubmit = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        company_id: form.company_id === "none" ? null : Number(form.company_id),
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        next_follow_up_at: form.next_follow_up_at || null,
      }

      if (selected) {
        await crmRequest(`/customers/${selected.id}`, "PUT", payload)
        toast({ title: "Müştəri yeniləndi" })
      } else {
        await crmRequest("/customers", "POST", payload)
        toast({ title: "CRM müştərisi yaradıldı" })
      }

      setOpen(false)
      await load(1)
      setPage(1)
    } catch (err) {
      toast({
        title: "Əməliyyat alınmadı",
        description: err instanceof Error ? err.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (customer: CrmCustomer) => {
    const confirmed = window.confirm(`${customer.name} silinsin?`)
    if (!confirmed) {
      return
    }

    try {
      await crmRequest(`/customers/${customer.id}`, "DELETE")
      toast({ title: "Müştəri silindi" })
      await load(page)
    } catch (err) {
      toast({
        title: "Silmə alınmadı",
        description: err instanceof Error ? err.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const stats = useMemo(() => ({
    vip: items.filter((item) => item.crm_status === "vip").length,
    debt: items.reduce((sum, item) => sum + Number(item.total_debt ?? 0), 0),
    followUp: items.filter((item) => item.next_follow_up_at).length,
  }), [items])

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader
          title="CRM Müştərilər"
          description="Customer 360 görünüşü, borc konteksti, status segmentləri və follow-up məlumatları bir yerdə."
          actions={<Button onClick={openCreate} className="gap-2"><Plus className="size-4" />Yeni müştəri</Button>}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">VIP müştəri</p><p className="mt-2 text-2xl font-semibold">{stats.vip}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Toplam borc</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(stats.debt)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Follow-up planı</p><p className="mt-2 text-2xl font-semibold">{stats.followUp}</p></CardContent></Card>
        </div>

        <CrmToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          filters={
            <Select value={status} onValueChange={(value) => {
              setStatus(value)
              setPage(1)
            }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                {crmCustomerStatusOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}

        <Card className="border-border/70">
          <CardContent className="p-0">
            {!loading && !items.length ? (
              <div className="p-6">
                <CrmEmptyState title="CRM müştərisi yoxdur" description="Yeni müştəri yaradıb satış və follow-up tarixçəsini CRM daxilində toplamağa başlayın." action={<Button onClick={openCreate}>Müştəri yarat</Button>} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müştəri</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Əlaqə</TableHead>
                    <TableHead>Borc</TableHead>
                    <TableHead>Lifetime value</TableHead>
                    <TableHead>Növbəti addım</TableHead>
                    <TableHead className="text-right">Əməliyyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.name}</p>
                            {item.crm_status === "vip" ? <Star className="size-4 text-amber-500" /> : null}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.company?.name ?? (item.entity_type === "company" ? "Şirkət müştərisi" : "Fiziki şəxs")}</p>
                        </div>
                      </TableCell>
                      <TableCell><CrmStatusBadge value={item.crm_status} /></TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{item.phone}</p>
                          <p className="text-muted-foreground">{item.email ?? "Email yoxdur"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(item.total_debt)}</TableCell>
                      <TableCell>{formatCurrency(item.lifetime_value ?? 0)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{item.next_action ?? "Plan yoxdur"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(item.next_follow_up_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="icon" variant="ghost">
                            <Link href={`/crm/customers/${item.id}`}><Eye className="size-4" /></Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Save className="size-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => onDelete(item)}><Trash2 className="size-4" /></Button>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected ? "Müştərini redaktə et" : "Yeni CRM müştərisi"}</DialogTitle>
            <DialogDescription>Telefon və email üzrə təkrar qeydiyyat backend tərəfindən yoxlanılır.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Tip</Label>
              <Select value={form.entity_type} onValueChange={(value: CustomerForm["entity_type"]) => setForm((prev) => ({ ...prev, entity_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Fiziki şəxs</SelectItem>
                  <SelectItem value="company">Şirkət</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>VÖEN</Label><Input value={form.tax_id} onChange={(e) => setForm((prev) => ({ ...prev, tax_id: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Şirkət</Label>
              <Select value={form.company_id} onValueChange={(value) => setForm((prev) => ({ ...prev, company_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Şirkət seçin" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Şirkət yoxdur</SelectItem>
                  {companies.map((company) => <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CRM status</Label>
              <Select value={form.crm_status} onValueChange={(value: CustomerForm["crm_status"]) => setForm((prev) => ({ ...prev, crm_status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {crmCustomerStatusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mənbə</Label>
              <Select value={form.source} onValueChange={(value: CustomerForm["source"]) => setForm((prev) => ({ ...prev, source: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {crmSourceOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Next action</Label><Input value={form.next_action} onChange={(e) => setForm((prev) => ({ ...prev, next_action: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Follow-up tarixi</Label><Input type="datetime-local" value={form.next_follow_up_at} onChange={(e) => setForm((prev) => ({ ...prev, next_follow_up_at: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Tag-lər</Label><Input value={form.tags} onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="vip, fleet, debt-risk" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Ünvan</Label><Textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Qeyd</Label><Textarea value={form.crm_note} onChange={(e) => setForm((prev) => ({ ...prev, crm_note: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void onSubmit()} disabled={saving} className="gap-2">
              <Save className="size-4" />
              {saving ? "Yadda saxlanır..." : "Yadda saxla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
