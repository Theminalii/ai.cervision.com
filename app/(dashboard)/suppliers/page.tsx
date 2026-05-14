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
import { Loader2, MoreHorizontal, Eye, Edit, Trash2, Search, Plus, Download, Building2, Truck, Package, DollarSign } from "lucide-react"

type PaginatedResponse<T> = { data: T[] }

type Account = {
  id: number
  name: string
  type: "cash" | "bank"
  balance: number
  status: "active" | "passive"
}

type Supplier = {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  total_debt: number
  status: "active" | "passive"
}

type Purchase = {
  id: number
  purchase_number: string
  supplier: { id: number; name: string } | null
  total_amount: number
  paid_amount: number
  debt_amount: number
  purchase_date: string
}

type DebtTransaction = {
  id: number
  type: "debt" | "payment"
  amount: number
  note: string | null
  transaction_date: string
}

type SupplierForm = {
  id: number | null
  name: string
  phone: string
  email: string
  address: string
  status: "active" | "passive"
}

type PaymentForm = {
  supplierId: string
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

const emptySupplierForm = (): SupplierForm => ({
  id: null,
  name: "",
  phone: "",
  email: "",
  address: "",
  status: "active",
})

const emptyPaymentForm = (): PaymentForm => ({
  supplierId: "",
  amount: "",
  payment_method: "bank",
  transaction_date: currentDate(),
  note: "",
})

export default function SuppliersPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [selectedDebtTransactions, setSelectedDebtTransactions] = useState<DebtTransaction[]>([])
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm())
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm())

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const token = await ensureBackendToken("bestsol-suppliers-web")
      const [suppliersResponse, purchasesResponse] = await Promise.all([
        backendFetch("/suppliers?per_page=500&sort=id&direction=desc", token),
        backendFetch("/purchases?per_page=500", token),
      ])
      let accountsJson: Account[] = []
      try {
        const accountsResponse = await backendFetch("/finance/accounts", token)
        accountsJson = await accountsResponse.json()
      } catch {
        accountsJson = []
      }
      const suppliersJson = (await suppliersResponse.json()) as PaginatedResponse<Supplier>
      const purchasesJson = (await purchasesResponse.json()) as PaginatedResponse<Purchase>
      setSuppliers(suppliersJson.data ?? [])
      setPurchases(purchasesJson.data ?? [])
      setAccounts(accountsJson)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Təchizatçılar yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const metrics = useMemo(() => {
    const purchasesBySupplier = new Map<number, { totalOrders: number; totalValue: number }>()
    purchases.forEach((purchase) => {
      if (!purchase.supplier?.id) return
      const existing = purchasesBySupplier.get(purchase.supplier.id) ?? { totalOrders: 0, totalValue: 0 }
      existing.totalOrders += 1
      existing.totalValue += purchase.total_amount
      purchasesBySupplier.set(purchase.supplier.id, existing)
    })
    return purchasesBySupplier
  }, [purchases])

  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return suppliers.filter((supplier) =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.phone.toLowerCase().includes(term) ||
      (supplier.email ?? "").toLowerCase().includes(term),
    )
  }, [searchTerm, suppliers])

  const totalPurchases = useMemo(
    () => purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount ?? 0), 0),
    [purchases],
  )

  const totalDebt = useMemo(
    () => suppliers.reduce((sum, supplier) => sum + Number(supplier.total_debt ?? 0), 0),
    [suppliers],
  )

  const selectedPaymentSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier.id) === paymentForm.supplierId) ?? null,
    [paymentForm.supplierId, suppliers],
  )

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.type === paymentForm.payment_method && account.status === "active") ?? null,
    [accounts, paymentForm.payment_method],
  )

  const openCreateDialog = () => {
    setSupplierForm(emptySupplierForm())
    setIsSupplierDialogOpen(true)
  }

  const openEditDialog = (supplier: Supplier) => {
    setSupplierForm({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      status: supplier.status,
    })
    setIsSupplierDialogOpen(true)
  }

  const openDetailDialog = async (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSelectedDebtTransactions([])
    setIsDetailDialogOpen(true)
    try {
      const token = await ensureBackendToken("bestsol-supplier-detail")
      const response = await backendFetch(`/suppliers/${supplier.id}/debts`, token)
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

  const openPaymentDialog = (supplier?: Supplier) => {
    const activeBank = accounts.find((account) => account.type === "bank" && account.status === "active")
    const activeCash = accounts.find((account) => account.type === "cash" && account.status === "active")
    const suggestedMethod =
      supplier && activeBank && activeBank.balance >= supplier.total_debt
        ? "bank"
        : supplier && activeCash && activeCash.balance >= supplier.total_debt
          ? "cash"
          : "bank"

    setPaymentForm({
      ...emptyPaymentForm(),
      supplierId: supplier ? String(supplier.id) : "",
      amount: supplier ? String(Number(supplier.total_debt).toFixed(2)) : "",
      payment_method: suggestedMethod,
    })
    setIsPaymentDialogOpen(true)
  }

  const saveSupplier = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-supplier-save")
      await backendFetch(supplierForm.id ? `/suppliers/${supplierForm.id}` : "/suppliers", token, {
        method: supplierForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supplierForm.name,
          phone: supplierForm.phone,
          email: supplierForm.email || null,
          address: supplierForm.address || null,
          status: supplierForm.status,
        }),
      })
      toast({ title: "Təchizatçı saxlanıldı" })
      setIsSupplierDialogOpen(false)
      await bootstrap()
    } catch (error) {
      toast({
        title: "Təchizatçı saxlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSupplier = async (supplier: Supplier) => {
    if (!window.confirm(`"${supplier.name}" təchizatçısını silmək istəyirsiniz?`)) return
    try {
      const token = await ensureBackendToken("bestsol-supplier-delete")
      await backendFetch(`/suppliers/${supplier.id}`, token, { method: "DELETE" })
      toast({ title: "Təchizatçı silindi" })
      await bootstrap()
    } catch (error) {
      toast({
        title: "Təchizatçı silinmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const submitPayment = async () => {
    setIsSaving(true)
    try {
      if (!paymentForm.supplierId) {
        throw new Error("Əvvəlcə təchizatçı seçin.")
      }

      const amount = Number(paymentForm.amount || 0)
      if (amount <= 0) {
        throw new Error("Ödəniş məbləği 0-dan böyük olmalıdır.")
      }

      const supplier = suppliers.find((item) => String(item.id) === paymentForm.supplierId)
      if (!supplier) {
        throw new Error("Seçilmiş təchizatçı tapılmadı.")
      }

      if (amount > Number(supplier.total_debt)) {
        throw new Error("Ödəniş məbləği təchizatçının cari borcundan çox ola bilməz.")
      }

      const account = accounts.find((item) => item.type === paymentForm.payment_method && item.status === "active")
      if (account && amount > Number(account.balance)) {
        throw new Error(`${account.name} hesabında kifayət qədər məbləğ yoxdur.`)
      }

      const token = await ensureBackendToken("bestsol-supplier-payment")
      await backendFetch(`/suppliers/${paymentForm.supplierId}/payment`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payment_method: paymentForm.payment_method,
          transaction_date: paymentForm.transaction_date,
          note: paymentForm.note || null,
        }),
      })
      toast({ title: "Ödəniş qeydə alındı" })
      setIsPaymentDialogOpen(false)
      await bootstrap()
      if (selectedSupplier && String(selectedSupplier.id) === paymentForm.supplierId) {
        await openDetailDialog(selectedSupplier)
      }
    } catch (error) {
      toast({
        title: "Ödəniş tamamlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const exportSuppliers = () => {
    const rows = [
      ["name", "phone", "email", "address", "status", "total_debt"],
      ...filteredSuppliers.map((supplier) => [
        supplier.name,
        supplier.phone,
        supplier.email ?? "",
        supplier.address ?? "",
        supplier.status,
        String(supplier.total_debt),
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "suppliers.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Təchizatçılar" subtitle="Təchizatçı bazası və borc axınları" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Təchizatçılar yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Təchizatçılar" subtitle="Təchizatçı bazası və borc axınları" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight">Təchizatçılar</div>
            <p className="text-muted-foreground">Real satınalma və borc məlumatları ilə idarə edin</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSuppliers}>
              <Download className="mr-2 h-4 w-4" />
              İxrac
            </Button>
            <Button variant="outline" onClick={() => openPaymentDialog()}>
              <DollarSign className="mr-2 h-4 w-4" />
              Borc ödə
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni təchizatçı
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard title="Ümumi Təchizatçılar" value={String(suppliers.length)} icon={Building2} />
          <StatCard title="Aktiv Təchizatçılar" value={String(suppliers.filter((supplier) => supplier.status === "active").length)} icon={Truck} />
          <StatCard title="Ümumi Alış" value={formatCurrency(totalPurchases)} icon={Package} />
          <StatCard title="Ödəniləcək Borc" value={formatCurrency(totalDebt)} icon={DollarSign} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Təchizatçı Siyahısı</CardTitle>
                <CardDescription>Bütün təchizatçıları buradan idarə edin</CardDescription>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Təchizatçı axtar..." className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Təchizatçı</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Satınalma</TableHead>
                  <TableHead className="text-right">Ümumi Alış</TableHead>
                  <TableHead className="text-right">Borc</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => {
                  const supplierMetrics = metrics.get(supplier.id) ?? { totalOrders: 0, totalValue: 0 }
                  return (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{initials(supplier.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-sm text-muted-foreground">{supplier.email ?? "E-poçt yoxdur"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.phone}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.status === "active" ? "default" : "secondary"}>{supplier.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{supplierMetrics.totalOrders}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(supplierMetrics.totalValue)}</TableCell>
                      <TableCell className="text-right">
                        <span className={Number(supplier.total_debt) > 0 ? "font-medium text-warning" : "font-medium text-success"}>
                          {formatCurrency(supplier.total_debt)}
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
                            <DropdownMenuItem onClick={() => void openDetailDialog(supplier)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Baxış
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(supplier)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Redaktə
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPaymentDialog(supplier)}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Ödəniş et
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => void deleteSupplier(supplier)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Uyğun təchizatçı tapılmadı.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{supplierForm.id ? "Təchizatçını redaktə et" : "Yeni təchizatçı"}</DialogTitle>
            <DialogDescription>Təchizatçı məlumatlarını sistemə yazın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Şirkət adı">
              <Input value={supplierForm.name} onChange={(event) => setSupplierForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
            <Field label="Telefon">
              <Input value={supplierForm.phone} onChange={(event) => setSupplierForm((current) => ({ ...current, phone: event.target.value }))} />
            </Field>
            <Field label="E-poçt">
              <Input value={supplierForm.email} onChange={(event) => setSupplierForm((current) => ({ ...current, email: event.target.value }))} />
            </Field>
            <Field label="Ünvan">
              <Input value={supplierForm.address} onChange={(event) => setSupplierForm((current) => ({ ...current, address: event.target.value }))} />
            </Field>
            <Field label="Status">
              <div className="flex gap-2">
                <Button type="button" variant={supplierForm.status === "active" ? "default" : "outline"} onClick={() => setSupplierForm((current) => ({ ...current, status: "active" }))}>Aktiv</Button>
                <Button type="button" variant={supplierForm.status === "passive" ? "default" : "outline"} onClick={() => setSupplierForm((current) => ({ ...current, status: "passive" }))}>Passiv</Button>
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSupplierDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void saveSupplier()}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Təchizatçı ödənişi</DialogTitle>
            <DialogDescription>Təchizatçı borcunu seçilən hesabdan çıxın.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Təchizatçı">
              <Select
                value={paymentForm.supplierId}
                onValueChange={(value) => {
                  const supplier = suppliers.find((item) => String(item.id) === value)
                  setPaymentForm((current) => ({
                    ...current,
                    supplierId: value,
                    amount: supplier ? String(Number(supplier.total_debt).toFixed(2)) : current.amount,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Təchizatçı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter((supplier) => Number(supplier.total_debt) > 0).map((supplier) => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name} • {formatCurrency(supplier.total_debt)}
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
            {selectedPaymentSupplier && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                Cari borc: <span className="font-medium">{formatCurrency(selectedPaymentSupplier.total_debt)}</span>
              </div>
            )}
            {selectedAccount && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                Hesab qalığı: <span className="font-medium">{selectedAccount.name} • {formatCurrency(selectedAccount.balance)}</span>
              </div>
            )}
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
            <DialogTitle>{selectedSupplier?.name ?? "Təchizatçı detalı"}</DialogTitle>
            <DialogDescription>Satınalma və borc tarixçəsi</DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <DetailTile label="Telefon" value={selectedSupplier.phone} />
                <DetailTile label="E-poçt" value={selectedSupplier.email ?? "-"} />
                <DetailTile label="Ümumi borc" value={formatCurrency(selectedSupplier.total_debt)} />
                <DetailTile label="Satınalma sayı" value={String(metrics.get(selectedSupplier.id)?.totalOrders ?? 0)} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Son satınalmalar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {purchases.filter((purchase) => purchase.supplier?.id === selectedSupplier.id).map((purchase) => (
                          <div key={purchase.id} className="rounded-lg border px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-medium">{purchase.purchase_number}</div>
                                <div className="text-sm text-muted-foreground">{formatDate(purchase.purchase_date)}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatCurrency(purchase.total_amount)}</div>
                                <div className="text-xs text-muted-foreground">Borc: {formatCurrency(purchase.debt_amount)}</div>
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
                                <div className="font-medium">{item.type === "debt" ? "Borc yazıldı" : "Ödəniş edildi"}</div>
                                <div className="text-sm text-muted-foreground">{formatDate(item.transaction_date)}</div>
                              </div>
                              <div className={`font-medium ${item.type === "debt" ? "text-warning" : "text-success"}`}>
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

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Building2 }) {
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
