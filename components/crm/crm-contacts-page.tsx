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
import { CrmEmptyState, CrmPageHeader, CrmPagination, CrmToolbar } from "@/components/crm/crm-shared"
import { crmFetch, crmRequest, type CrmApiList, type CrmCompany, type CrmContact, type CrmCustomer } from "@/lib/crm"

type ContactForm = {
  first_name: string
  last_name: string
  job_title: string
  phone: string
  email: string
  company_id: string
  customer_id: string
  notes: string
  is_primary: string
  linkedin: string
  instagram: string
}

const emptyForm = (): ContactForm => ({
  first_name: "",
  last_name: "",
  job_title: "",
  phone: "",
  email: "",
  company_id: "none",
  customer_id: "none",
  notes: "",
  is_primary: "false",
  linkedin: "",
  instagram: "",
})

export function CrmContactsPage() {
  const [items, setItems] = useState<CrmContact[]>([])
  const [customers, setCustomers] = useState<CrmCustomer[]>([])
  const [companies, setCompanies] = useState<CrmCompany[]>([])
  const [meta, setMeta] = useState<CrmApiList<CrmContact>["meta"]>()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<CrmContact | null>(null)
  const [form, setForm] = useState<ContactForm>(emptyForm())

  const load = useCallback(async (currentPage = page) => {
    const [contactsRes, customersRes, companiesRes] = await Promise.all([
      crmFetch<CrmApiList<CrmContact>>(`/contacts?per_page=12&page=${currentPage}&search=${encodeURIComponent(search)}`),
      crmFetch<CrmApiList<CrmCustomer>>("/customers?per_page=200"),
      crmFetch<CrmApiList<CrmCompany>>("/companies?per_page=200"),
    ])
    setItems(contactsRes.data ?? [])
    setMeta(contactsRes.meta)
    setCustomers(customersRes.data ?? [])
    setCompanies(companiesRes.data ?? [])
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

  const openEdit = (contact: CrmContact) => {
    setSelected(contact)
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name ?? "",
      job_title: contact.job_title ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      company_id: contact.company_id ? String(contact.company_id) : "none",
      customer_id: contact.customer_id ? String(contact.customer_id) : "none",
      notes: contact.notes ?? "",
      is_primary: String(Boolean(contact.is_primary)),
      linkedin: contact.social_links?.linkedin ?? "",
      instagram: contact.social_links?.instagram ?? "",
    })
    setOpen(true)
  }

  const save = async () => {
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name || null,
        job_title: form.job_title || null,
        phone: form.phone || null,
        email: form.email || null,
        company_id: form.company_id === "none" ? null : Number(form.company_id),
        customer_id: form.customer_id === "none" ? null : Number(form.customer_id),
        notes: form.notes || null,
        is_primary: form.is_primary === "true",
        social_links: {
          linkedin: form.linkedin,
          instagram: form.instagram,
        },
      }
      if (selected) {
        await crmRequest(`/contacts/${selected.id}`, "PUT", payload)
      } else {
        await crmRequest("/contacts", "POST", payload)
      }
      toast({ title: selected ? "Kontakt yeniləndi" : "Kontakt yaradıldı" })
      setOpen(false)
      await load(1)
      setPage(1)
    } catch (err) {
      toast({ title: "Kontakt saxlanmadı", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  const removeContact = async (contact: CrmContact) => {
    if (!window.confirm(`${contact.first_name} ${contact.last_name ?? ""} silinsin?`)) return
    try {
      await crmRequest(`/contacts/${contact.id}`, "DELETE")
      toast({ title: "Kontakt silindi" })
      await load(page)
    } catch (err) {
      toast({ title: "Kontakt silinmədi", description: err instanceof Error ? err.message : "Xəta baş verdi.", variant: "destructive" })
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="Kontakt şəxslər" description="Şirkət və müştərilərə bağlı əsas əlaqə şəxslərini və sosial profillərini CRM daxilində toplayın." actions={<Button onClick={openCreate} className="gap-2"><Plus className="size-4" />Yeni kontakt</Button>} />
        <CrmToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(1) }} />
        <Card>
          <CardContent className="p-0">
            {!items.length ? (
              <div className="p-6"><CrmEmptyState title="Kontakt yoxdur" description="Əlaqə qurduğunuz əsas şəxsləri burada saxlayın." action={<Button onClick={openCreate}>Kontakt əlavə et</Button>} /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ad</TableHead>
                    <TableHead>Vəzifə</TableHead>
                    <TableHead>Əlaqə</TableHead>
                    <TableHead>Şirkət</TableHead>
                    <TableHead>Əsas kontakt</TableHead>
                    <TableHead className="text-right">Əməliyyat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><p className="font-medium">{item.first_name} {item.last_name ?? ""}</p></TableCell>
                      <TableCell>{item.job_title ?? "Qeyd edilməyib"}</TableCell>
                      <TableCell>{item.phone ?? "Telefon yoxdur"} • {item.email ?? "Email yoxdur"}</TableCell>
                      <TableCell>{item.company?.name ?? item.customer?.name ?? "Bağlantı yoxdur"}</TableCell>
                      <TableCell>{item.is_primary ? "Bəli" : "Xeyr"}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Redaktə</Button><Button size="icon" variant="ghost" onClick={() => removeContact(item)}><Trash2 className="size-4" /></Button></div></TableCell>
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
          <DialogHeader><DialogTitle>{selected ? "Kontakt redaktəsi" : "Yeni kontakt"}</DialogTitle><DialogDescription>Əsas kontakt işarəsi və sosial linklər dəstəklənir.</DialogDescription></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Ad</Label><Input value={form.first_name} onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Soyad</Label><Input value={form.last_name} onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Vəzifə</Label><Input value={form.job_title} onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Əsas kontakt</Label>
              <Select value={form.is_primary} onValueChange={(value) => setForm((prev) => ({ ...prev, is_primary: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Bəli</SelectItem><SelectItem value="false">Xeyr</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Şirkət</Label>
              <Select value={form.company_id} onValueChange={(value) => setForm((prev) => ({ ...prev, company_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Şirkət yoxdur</SelectItem>{companies.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Müştəri</Label>
              <Select value={form.customer_id} onValueChange={(value) => setForm((prev) => ({ ...prev, customer_id: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Müştəri yoxdur</SelectItem>{customers.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>LinkedIn</Label><Input value={form.linkedin} onChange={(e) => setForm((prev) => ({ ...prev, linkedin: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Instagram</Label><Input value={form.instagram} onChange={(e) => setForm((prev) => ({ ...prev, instagram: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Qeyd</Label><Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button><Button onClick={() => void save()}>Yadda saxla</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
