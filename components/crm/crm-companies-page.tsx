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
import { CrmEmptyState, CrmPageHeader, CrmPagination, CrmStatusBadge, CrmToolbar } from "@/components/crm/crm-shared"
import { crmCustomerStatusOptions, crmFetch, crmRequest, type CrmApiList, type CrmCompany, type CrmCustomer } from "@/lib/crm"

type CompanyForm = {
  name: string
  tax_id: string
  email: string
  phone: string
  website: string
  segment: string
  status: CrmCompany["status"]
  address: string
  notes: string
  customer_id: string
}

const emptyForm = (): CompanyForm => ({
  name: "",
  tax_id: "",
  email: "",
  phone: "",
  website: "",
  segment: "",
  status: "active",
  address: "",
  notes: "",
  customer_id: "none",
})

export function CrmCompaniesPage() {
  const [items, setItems] = useState<CrmCompany[]>([])
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [meta, setMeta] = useState<CrmApiList<CrmCompany>["meta"]>()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CrmCompany | null>(null)
  const [form, setForm] = useState<CompanyForm>(emptyForm())

  const load = useCallback(async (currentPage = page) => {
    const [companiesRes, customersRes] = await Promise.all([
      crmFetch<CrmApiList<CrmCompany>>(`/companies?per_page=12&page=${currentPage}&search=${encodeURIComponent(search)}`),
      crmFetch<CrmApiList<CrmCustomer>>("/customers?per_page=200"),
    ])
    setItems(companiesRes.data ?? [])
    setMeta(companiesRes.meta)
    setCustomers(customersRes.data ?? [])
  }, [page, search])

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

  const openEdit = (company: CrmCompany) => {
    setSelected(company)
    setForm({
      name: company.name,
      tax_id: company.tax_id ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      website: company.website ?? "",
      segment: company.segment ?? "",
      status: company.status,
      address: company.address ?? "",
      notes: company.notes ?? "",
      customer_id: company.customer_id ? String(company.customer_id) : "none",
    })
    setOpen(true)
  }

  const save = async () => {
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id === "none" ? null : Number(form.customer_id),
      }
      if (selected) {
        await crmRequest(`/companies/${selected.id}`, "PUT", payload)
      } else {
        await crmRequest("/companies", "POST", payload)
      }
      toast({ title: selected ? "Şirkət yeniləndi" : "Şirkət yaradıldı" })
      setOpen(false)
      await load(1)
      setPage(1)
    } catch (err) {
      toast({ title: "Şirkət saxlanmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const removeCompany = async (company: CrmCompany) => {
    if (!window.confirm(`${company.name} silinsin?`)) return
    try {
      await crmRequest(`/companies/${company.id}`, "DELETE")
      toast({ title: "Şirkət silindi" })
      await load(page)
    } catch (err) {
      toast({ title: "Şirkət silinmədi", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="CRM Şirkətlər" description="Segment, status, kontaktlar və bağlı deal-ları üzrə şirkət bazasını idarə edin." actions={<Button onClick={openCreate} className="gap-2"><Plus className="size-4" />Yeni şirkət</Button>} />
        <CrmToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(1) }} />
        <Card>
          <CardContent className="p-0">
            {!items.length ? (
              <div className="p-6">
                <CrmEmptyState title="Şirkət yoxdur" description="Şirkət profilləri kontakt və deal-lar üçün əsas konteks yaradır." action={<Button onClick={openCreate}>Şirkət əlavə et</Button>} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Şirkət</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Əlaqə</TableHead>
                    <TableHead className="text-right">Əməliyyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.tax_id ?? "VÖEN yoxdur"}</p></div></TableCell>
                      <TableCell>{item.segment ?? "Seqment yoxdur"}</TableCell>
                      <TableCell><CrmStatusBadge value={item.status} /></TableCell>
                      <TableCell>{item.phone ?? "Telefon yoxdur"} • {item.email ?? "Email yoxdur"}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Redaktə</Button><Button size="icon" variant="ghost" onClick={() => removeCompany(item)}><Trash2 className="size-4" /></Button></div></TableCell>
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
          <DialogHeader><DialogTitle>{selected ? "Şirkət redaktəsi" : "Yeni şirkət"}</DialogTitle><DialogDescription>Şirkət profili CRM müştəri və kontaktlar üçün ortaq konteks yaradır.</DialogDescription></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Ad</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>VÖEN</Label><Input value={form.tax_id} onChange={(e) => setForm((prev) => ({ ...prev, tax_id: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Segment</Label><Input value={form.segment} onChange={(e) => setForm((prev) => ({ ...prev, segment: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value: CompanyForm["status"]) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{crmCustomerStatusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bağlı müştəri</Label>
              <Select value={form.customer_id} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Müştəri bağlı deyil</SelectItem>{customers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2"><Label>Ünvan</Label><Textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Qeyd</Label><Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button><Button onClick={() => void save()}>Yadda saxla</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
