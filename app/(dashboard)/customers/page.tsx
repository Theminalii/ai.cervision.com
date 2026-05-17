"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, MoreHorizontal, Eye, Edit, Trash2, Search, Plus, Download, Users, TrendingUp, DollarSign, ShoppingCart } from "lucide-react"

type PaginatedResponse<T> = { data: T[] }

type CustomerMeta = {
  current_user: {
    id: number
    name: string
    role: string | null
  }
  can_assign_customers: boolean
  sales_reps: SalesRep[]
}

type SalesRep = {
  id: number
  name: string
  email: string
}

type Customer = {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  assigned_user_id: number | null
  assigned_user?: {
    id: number | null
    name: string | null
    email: string | null
  } | null
  total_debt: number
  status: "active" | "passive"
}

type Sale = {
  id: number
  sale_number: string
  customer: { id: number; name: string } | null
  total_amount: number
  debt_amount: number
  paid_amount: number
  payment_status: "paid" | "partial" | "debt"
  sale_date: string
}

type DebtTransaction = {
  id: number
  type: "debt" | "payment"
  amount: number
  note: string | null
  transaction_date: string
  reference_type: string | null
  reference_id: number | null
}

type CustomerForm = {
  id: number | null
  name: string
  phone: string
  email: string
  address: string
  assigned_user_id: string
  status: "active" | "passive"
}

type PaymentForm = {
  customerId: string
  amount: string
  payment_method: "cash" | "bank"
  transaction_date: string
  note: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

const currentDate = () => new Date().toISOString().slice(0, 10)

const emptyCustomerForm = (): CustomerForm => ({
  id: null,
  name: "",
  phone: "",
  email: "",
  address: "",
  assigned_user_id: "",
  status: "active",
})

const emptyPaymentForm = (): PaymentForm => ({
  customerId: "",
  amount: "",
  payment_method: "cash",
  transaction_date: currentDate(),
  note: "",
})

export default function CustomersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [meta, setMeta] = useState<CustomerMeta | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedDebtTransactions, setSelectedDebtTransactions] = useState<DebtTransaction[]>([])
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm())
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm())

  async function bootstrap() {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const token = await ensureBackendToken("bestsol-customers-web")
      const [customersResponse, salesResponse, metaResponse] = await Promise.all([
        backendFetch("/customers?per_page=500&sort=id&direction=desc", token),
        backendFetch("/sales?per_page=500", token),
        backendFetch("/customers/meta", token),
      ])

      const customersJson = (await customersResponse.json()) as PaginatedResponse<Customer>
      const salesJson = (await salesResponse.json()) as PaginatedResponse<Sale>
      const metaJson = (await metaResponse.json()) as CustomerMeta
      setCustomers(customersJson.data ?? [])
      setSales(salesJson.data ?? [])
      setMeta(metaJson)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Müştərilər yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootstrap()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const metrics = useMemo(() => {
    const salesByCustomer = new Map<number, { totalOrders: number; totalRevenue: number }>()
    sales.forEach((sale) => {
      if (!sale.customer?.id) return
      const existing = salesByCustomer.get(sale.customer.id) ?? { totalOrders: 0, totalRevenue: 0 }
      existing.totalOrders += 1
      existing.totalRevenue += sale.total_amount
      salesByCustomer.set(sale.customer.id, existing)
    })
    return salesByCustomer
  }, [sales])

  const filteredCustomers = useMemo(() => {
    const base = customers.filter((customer) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        customer.name.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term) ||
        (customer.email ?? "").toLowerCase().includes(term)
      if (!matchesSearch) return false
      if (activeTab === "active") return (metrics.get(customer.id)?.totalOrders ?? 0) > 0
      if (activeTab === "debt") return Number(customer.total_debt) > 0
      return true
    })

    return base
  }, [activeTab, customers, metrics, searchTerm])

  const totalRevenue = useMemo(
    () => sales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0),
    [sales],
  )

  const totalDebt = useMemo(
    () => customers.reduce((sum, customer) => sum + Number(customer.total_debt ?? 0), 0),
    [customers],
  )

  const openCreateDialog = () => {
    setCustomerForm(emptyCustomerForm())
    setIsCustomerDialogOpen(true)
  }

  const openEditDialog = (customer: Customer) => {
    setCustomerForm({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? "",
      address: customer.address ?? "",
      assigned_user_id: customer.assigned_user_id ? String(customer.assigned_user_id) : "",
      status: customer.status,
    })
    setIsCustomerDialogOpen(true)
  }

  const openDetailDialog = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setSelectedDebtTransactions([])
    setIsDetailDialogOpen(true)
    try {
      const token = await ensureBackendToken("bestsol-customer-detail")
      const response = await backendFetch(`/customers/${customer.id}/debts`, token)
      const json = await response.json()
      setSelectedDebtTransactions(json.transactions ?? [])
    } catch (error) {
      toast({
        title: "Borclar yüklənmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const openPaymentDialog = (customer?: Customer) => {
    setPaymentForm({
      ...emptyPaymentForm(),
      customerId: customer ? String(customer.id) : "",
    })
    setIsPaymentDialogOpen(true)
  }

  const saveCustomer = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-customer-save")
      await backendFetch(customerForm.id ? `/customers/${customerForm.id}` : "/customers", token, {
        method: customerForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerForm.name,
          phone: customerForm.phone,
          email: customerForm.email || null,
          address: customerForm.address || null,
          assigned_user_id: customerForm.assigned_user_id ? Number(customerForm.assigned_user_id) : null,
          status: customerForm.status,
        }),
      })
      toast({ title: "Müştəri saxlanıldı" })
      setIsCustomerDialogOpen(false)
      await bootstrap()
    } catch (error) {
      toast({
        title: "Müştəri saxlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`"${customer.name}" müştərisini silmək istəyirsiniz?`)) return
    try {
      const token = await ensureBackendToken("bestsol-customer-delete")
      await backendFetch(`/customers/${customer.id}`, token, { method: "DELETE" })
      toast({ title: "Müştəri silindi" })
      await bootstrap()
    } catch (error) {
      toast({
        title: "Müştəri silinmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const submitPayment = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-customer-payment")
      await backendFetch(`/customers/${paymentForm.customerId}/payment`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentForm.amount || 0),
          payment_method: paymentForm.payment_method,
          transaction_date: paymentForm.transaction_date,
          note: paymentForm.note || null,
        }),
      })
      toast({ title: "Ödəniş qəbul edildi" })
      setIsPaymentDialogOpen(false)
      await bootstrap()
      if (selectedCustomer && String(selectedCustomer.id) === paymentForm.customerId) {
        await openDetailDialog(selectedCustomer)
      }
    } catch (error) {
      toast({
        title: "Ödəniş alınmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const exportCustomers = () => {
    const rows = [
      ["name", "phone", "email", "address", "status", "total_debt"],
      ...filteredCustomers.map((customer) => [
        customer.name,
        customer.phone,
        customer.email ?? "",
        customer.address ?? "",
        customer.status,
        String(customer.total_debt),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "customers.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Müştərilər" subtitle="Müştəri bazası və borc axınları" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Müştərilər yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Müştərilər" subtitle="Müştəri bazası və borc axınları" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">Müştərilər</div>
            <p className="text-muted-foreground">Real satış və borc məlumatları ilə idarə edin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCustomers}>
              <Download className="mr-2 h-4 w-4" />
              İxrac
            </Button>
            <Button variant="outline" onClick={() => openPaymentDialog()}>
              <DollarSign className="mr-2 h-4 w-4" />
              Borc ödənişi al
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni müştəri
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Ümumi Müştərilər" value={String(customers.length)} icon={Users} />
          <StatCard title="Aktiv Müştərilər" value={String(customers.filter((customer) => (metrics.get(customer.id)?.totalOrders ?? 0) > 0).length)} icon={ShoppingCart} />
          <StatCard title="Ümumi Satış" value={formatCurrency(totalRevenue)} icon={TrendingUp} />
          <StatCard title="Ümumi Borc" value={formatCurrency(totalDebt)} icon={DollarSign} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="all">Hamısı ({customers.length})</TabsTrigger>
              <TabsTrigger value="active">Aktiv ({customers.filter((customer) => (metrics.get(customer.id)?.totalOrders ?? 0) > 0).length})</TabsTrigger>
              <TabsTrigger value="debt">Borclu ({customers.filter((customer) => Number(customer.total_debt) > 0).length})</TabsTrigger>
            </TabsList>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Müştəri axtar..." className="pl-9" />
            </div>
          </div>

          <TabsContent value={activeTab}>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müştəri</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>E-poçt</TableHead>
                      {meta?.can_assign_customers && <TableHead>Nümayəndə</TableHead>}
                      <TableHead className="text-center">Sifarişlər</TableHead>
                      <TableHead className="text-right">Ümumi Alış</TableHead>
                      <TableHead className="text-right">Borc</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const customerMetrics = metrics.get(customer.id) ?? { totalOrders: 0, totalRevenue: 0 }
                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>{initials(customer.name)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">{customer.address ?? "Ünvan yoxdur"}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.email ?? "-"}</TableCell>
                          {meta?.can_assign_customers && <TableCell>{customer.assigned_user?.name ?? "Təhkim edilməyib"}</TableCell>}
                          <TableCell className="text-center">
                            <Badge variant="secondary">{customerMetrics.totalOrders}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(customerMetrics.totalRevenue)}</TableCell>
                          <TableCell className="text-right">
                            <span className={Number(customer.total_debt) > 0 ? "font-medium text-destructive" : "font-medium text-success"}>
                              {formatCurrency(customer.total_debt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => void openDetailDialog(customer)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Baxış
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Redaktə
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openPaymentDialog(customer)}>
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  Ödəniş al
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => void deleteCustomer(customer)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Sil
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredCustomers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={meta?.can_assign_customers ? 8 : 7} className="h-24 text-center text-muted-foreground">
                          Uyğun müştəri tapılmadı.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{customerForm.id ? "Müştərini redaktə et" : "Yeni müştəri"}</DialogTitle>
            <DialogDescription>Müştəri məlumatlarını sistemə yazın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Ad Soyad">
              <Input value={customerForm.name} onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Telefon">
              <Input value={customerForm.phone} onChange={(event) => setCustomerForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="E-poçt">
              <Input value={customerForm.email} onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Ünvan">
              <Input value={customerForm.address} onChange={(event) => setCustomerForm((current) => ({ ...current, address: event.target.value }))} />
            </Field>
            {meta?.can_assign_customers && (
              <Field label="Satış nümayəndəsi">
                <Select value={customerForm.assigned_user_id || "unassigned"} onValueChange={(value) => setCustomerForm((current) => ({ ...current, assigned_user_id: value === "unassigned" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Nümayəndə seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Təhkim edilməyib</SelectItem>
                    {meta.sales_reps.map((salesRep) => (
                      <SelectItem key={salesRep.id} value={String(salesRep.id)}>
                        {salesRep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Status">
              <div className="flex gap-2">
                <Button type="button" variant={customerForm.status === "active" ? "default" : "outline"} onClick={() => setCustomerForm((current) => ({ ...current, status: "active" }))}>Aktiv</Button>
                <Button type="button" variant={customerForm.status === "passive" ? "default" : "outline"} onClick={() => setCustomerForm((current) => ({ ...current, status: "passive" }))}>Passiv</Button>
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void saveCustomer()}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borc ödənişi al</DialogTitle>
            <DialogDescription>Müştəri borcunu seçilən hesaba daxil edin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Müştəri">
              <Select value={paymentForm.customerId} onValueChange={(value) => setPaymentForm((current) => ({ ...current, customerId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Müştəri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.filter((customer) => Number(customer.total_debt) > 0).map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name} • {formatCurrency(customer.total_debt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Məbləğ">
              <Input type="number" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
            </Field>
            <Field label="Ödəniş üsulu">
              <div className="flex gap-2">
                <Button type="button" variant={paymentForm.payment_method === "cash" ? "default" : "outline"} onClick={() => setPaymentForm((current) => ({ ...current, payment_method: "cash" }))}>Nağd</Button>
                <Button type="button" variant={paymentForm.payment_method === "bank" ? "default" : "outline"} onClick={() => setPaymentForm((current) => ({ ...current, payment_method: "bank" }))}>Bank</Button>
              </div>
            </Field>
            <Field label="Tarix">
              <Input type="date" value={paymentForm.transaction_date} onChange={(event) => setPaymentForm((current) => ({ ...current, transaction_date: event.target.value }))} />
            </Field>
            <Field label="Qeyd">
              <Input value={paymentForm.note} onChange={(event) => setPaymentForm((current) => ({ ...current, note: event.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void submitPayment()}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Təsdiqlə</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name ?? "Müştəri detalı"}</DialogTitle>
            <DialogDescription>Müştərinin borc və satış tarixçəsi</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <DetailTile label="Telefon" value={selectedCustomer.phone} />
                <DetailTile label="E-poçt" value={selectedCustomer.email ?? "-"} />
                <DetailTile label="Təhkim olunub" value={selectedCustomer.assigned_user?.name ?? "Təhkim edilməyib"} />
                <DetailTile label="Ümumi borc" value={formatCurrency(selectedCustomer.total_debt)} />
                <DetailTile label="Sifariş sayı" value={String(metrics.get(selectedCustomer.id)?.totalOrders ?? 0)} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Son satışlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {sales.filter((sale) => sale.customer?.id === selectedCustomer.id).map((sale) => (
                          <div key={sale.id} className="rounded-lg border px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{sale.sale_number}</div>
                                <div className="text-sm text-muted-foreground">{formatDate(sale.sale_date)}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                                <div className="text-xs text-muted-foreground">{sale.payment_status}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Borc hərəkətləri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {selectedDebtTransactions.map((item) => (
                          <div key={item.id} className="rounded-lg border px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{item.type === "debt" ? "Borc yazıldı" : "Ödəniş alındı"}</div>
                                <div className="text-sm text-muted-foreground">{formatDate(item.transaction_date)}</div>
                              </div>
                              <div className={`font-medium ${item.type === "debt" ? "text-destructive" : "text-success"}`}>
                                {item.type === "debt" ? "+" : "-"}{formatCurrency(item.amount)}
                              </div>
                            </div>
                            {item.note && <div className="mt-2 text-sm text-muted-foreground">{item.note}</div>}
                          </div>
                        ))}
                        {selectedDebtTransactions.length === 0 && (
                          <div className="text-sm text-muted-foreground">Borc hərəkəti tapılmadı.</div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Users }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}
