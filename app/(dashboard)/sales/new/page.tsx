"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { TOKEN_KEY, backendFetch, ensureBackendToken, loginToBackend } from "@/lib/backend-api"
import { ExcelImportButton } from "@/components/import/excel-import-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Calculator,
  Loader2,
  Package,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react"

type ApiProduct = {
  id: number
  product_code: string
  name: string
  cash_sale_price: number
  official_sale_price: number
  is_active: boolean
  stock?: {
    real_quantity: number
    official_quantity: number
    minimum_quantity: number
  } | null
}

type ApiCustomer = {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  total_debt: number
  status: "active" | "passive"
}

type SaleItem = {
  productId: number
  productName: string
  quantity: number
  unitPrice: number
  total: number
  availableStock: number
  stockType: "real" | "official" | "none"
}

type CustomerDraft = {
  name: string
  phone: string
  email: string
  address: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

const emptyCustomerDraft = (): CustomerDraft => ({
  name: "",
  phone: "",
  email: "",
  address: "",
})

const today = new Date().toISOString().slice(0, 10)

export default function NewSalePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [saleType, setSaleType] = useState<"cash" | "official">("cash")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash")
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "debt">("paid")
  const [stockOutput, setStockOutput] = useState(true)
  const [items, setItems] = useState<SaleItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [quantity, setQuantity] = useState<number>(1)
  const [paidAmount, setPaidAmount] = useState<string>("")
  const [note, setNote] = useState("")
  const [saleDate, setSaleDate] = useState(today)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomerDraft())

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active),
    [products],
  )

  const selectedCustomerData = useMemo(
    () => customers.find((customer) => customer.id === Number(selectedCustomer)) ?? null,
    [customers, selectedCustomer],
  )

  const subtotal = useMemo(
    () => roundMoney(items.reduce((sum, item) => sum + item.total, 0)),
    [items],
  )

  const debtAmount = useMemo(() => {
    if (paymentStatus === "paid") return 0
    const normalizedPaid = Math.max(0, Number(paidAmount) || 0)
    return Math.max(0, roundMoney(subtotal - normalizedPaid))
  }, [paidAmount, paymentStatus, subtotal])

  const paidAmountValue = useMemo(() => {
    if (paymentStatus === "paid") return subtotal
    if (paymentStatus === "debt") return 0
    return Math.max(0, roundMoney(Number(paidAmount) || 0))
  }, [paidAmount, paymentStatus, subtotal])

  const apiFetch = async (path: string, init?: RequestInit, customToken?: string) => {
    const activeToken = customToken ?? token
    if (!activeToken) {
      throw new Error("Backend token tapılmadı.")
    }

    try {
      return await backendFetch(path, activeToken, init)
    } catch (error) {
      if (error instanceof Error && error.message.includes("Sessiya bitib")) {
        setToken(null)
      }
      throw error
    }
  }

  async function bootstrap(existingToken: string | null) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = existingToken ?? (await ensureBackendToken("bestsol-sales-web"))

      setToken(activeToken)
      const [productsResponse, customersResponse] = await Promise.all([
        apiFetch("/products?per_page=200&sort=id&direction=asc", undefined, activeToken),
        apiFetch("/customers?per_page=200&sort=id&direction=asc", undefined, activeToken),
      ])

      const productsJson = await productsResponse.json()
      const customersJson = await customersResponse.json()

      setProducts(productsJson.data ?? [])
      setCustomers(customersJson.data ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Səhifə yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY)
    const timer = window.setTimeout(() => {
      void bootstrap(storedToken)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const updateSaleType = (value: "cash" | "official") => {
    setSaleType(value)
    setPaymentMethod(value === "cash" ? "cash" : "bank")
    setItems((current) =>
      current.map((item) => {
        const product = products.find((entry) => entry.id === item.productId)
        if (!product) return item

        const unitPrice = value === "cash" ? product.cash_sale_price : product.official_sale_price
        return {
          ...item,
          unitPrice,
          total: roundMoney(unitPrice * item.quantity),
          availableStock: value === "cash"
            ? Number(product.stock?.real_quantity ?? 0)
            : Number(product.stock?.official_quantity ?? 0),
          stockType: value === "cash"
            ? "real"
            : item.stockType === "none"
              ? "none"
              : "official",
        }
      }),
    )
  }

  const addItem = () => {
    setErrorMessage(null)
    setSaveMessage(null)

    if (!selectedProduct) {
      setErrorMessage("Əvvəlcə məhsul seçin.")
      return
    }

    if (quantity <= 0) {
      setErrorMessage("Miqdar 0-dan böyük olmalıdır.")
      return
    }

    const product = products.find((entry) => entry.id === Number(selectedProduct))
    if (!product) {
      setErrorMessage("Seçilmiş məhsul tapılmadı.")
      return
    }

    const availableStock = saleType === "cash"
      ? Number(product.stock?.real_quantity ?? 0)
      : Number(product.stock?.official_quantity ?? 0)

    if (saleType === "cash" && stockOutput && quantity > availableStock) {
      setErrorMessage(`Stok kifayət deyil. Mövcud qalıq: ${availableStock}`)
      return
    }

    const unitPrice = saleType === "cash" ? product.cash_sale_price : product.official_sale_price
    const defaultStockType: SaleItem["stockType"] = saleType === "cash"
      ? (stockOutput ? "real" : "none")
      : quantity <= availableStock ? "official" : "none"

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === product.id)
      if (existingIndex >= 0) {
        const existingItem = current[existingIndex]
        const nextQuantity = existingItem.quantity + quantity

        if (saleType === "cash" && stockOutput && nextQuantity > availableStock) {
          throw new Error(`Stok kifayət deyil. Mövcud qalıq: ${availableStock}`)
        }

        const updated = [...current]
        updated[existingIndex] = {
          ...existingItem,
          quantity: nextQuantity,
          unitPrice,
          total: roundMoney(unitPrice * nextQuantity),
          availableStock,
          stockType: saleType === "cash" ? (stockOutput ? "real" : "none") : existingItem.stockType,
        }
        return updated
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice,
          total: roundMoney(unitPrice * quantity),
          availableStock,
          stockType: defaultStockType,
        },
      ]
    })

    setSelectedProduct("")
    setQuantity(1)

    if (saleType === "official" && defaultStockType === "none") {
      setSaveMessage(`${product.name} rəsmi satışa əlavə olundu. Bu sətir üçün stok çıxışı söndürülüb.`)
    }
  }

  const handleAddItem = () => {
    try {
      addItem()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Məhsul əlavə olunmadı.")
    }
  }

  const removeItem = (productId: number) => {
    setItems((current) => current.filter((item) => item.productId !== productId))
  }

  const toggleOfficialItemStockOutput = (productId: number, checked: boolean) => {
    setErrorMessage(null)
    setSaveMessage(null)

    setItems((current) => current.map((item) => {
      if (item.productId !== productId) {
        return item
      }

      if (checked && item.quantity > item.availableStock) {
        throw new Error(`${item.productName} üçün stok kifayət deyil. Mövcud qalıq: ${item.availableStock}`)
      }

      return {
        ...item,
        stockType: checked ? "official" : "none",
      }
    }))
  }

  const createCustomer = async () => {
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      const response = await apiFetch("/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customerDraft,
          email: customerDraft.email || null,
          address: customerDraft.address || null,
          total_debt: 0,
          status: "active",
        }),
      })

      const customer = await response.json()
      setCustomers((current) => [...current, customer.data ?? customer])
      setSelectedCustomer(String((customer.data ?? customer).id))
      setCustomerDraft(emptyCustomerDraft())
      setIsAddCustomerOpen(false)
      setSaveMessage("Yeni müştəri əlavə olundu.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Müştəri əlavə olunmadı.")
    }
  }

  const submitSale = async () => {
    setErrorMessage(null)
    setSaveMessage(null)

    if (items.length === 0) {
      setErrorMessage("Ən azı bir məhsul əlavə edin.")
      return
    }

    if (paymentStatus !== "paid" && !selectedCustomer) {
      setErrorMessage("Borc və ya qismən ödəniş üçün müştəri seçilməlidir.")
      return
    }

    if (paymentStatus === "partial") {
      const partialAmount = Number(paidAmount) || 0
      if (partialAmount <= 0) {
        setErrorMessage("Qismən ödəniş üçün ödənilən məbləğ daxil edin.")
        return
      }
      if (partialAmount >= subtotal) {
        setErrorMessage("Qismən ödəniş məbləği cəmi satışdan kiçik olmalıdır.")
        return
      }
    }

    setIsSubmitting(true)

    try {
      const response = await apiFetch("/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer ? Number(selectedCustomer) : null,
          sale_type: saleType,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          paid_amount: paymentStatus === "paid" ? subtotal : paymentStatus === "partial" ? paidAmountValue : 0,
          stock_output: saleType === "official"
            ? items.some((item) => item.stockType !== "none")
            : stockOutput,
          note: note || null,
          sale_date: saleDate,
          items: items.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            stock_type: saleType === "official"
              ? item.stockType
              : stockOutput
                ? "real"
                : "none",
          })),
        }),
      })

      const sale = await response.json()
      setSaveMessage(`Satış yaradıldı: ${sale.data?.sale_number ?? "uğurlu əməliyyat"}`)
      router.push("/sales")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satış yaradılmadı.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Yeni Satış" subtitle="Satış əməliyyatı hazırlanır" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Satış məlumatları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Yeni Satış" subtitle="Canlı müştəri, məhsul və ödəniş məlumatları ilə satış yaradın" />

      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Link href="/sales">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Button>
          </Link>
          <ExcelImportButton target="sales" token={token} onImported={() => router.push("/sales")} />
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {saveMessage && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {saveMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Müştəri Seçimi</CardTitle>
                <CardDescription>Satış üçün müştəri seçin və ya yenisini yaradın</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row">
                  <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Müştəri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers
                        .filter((customer) => customer.status === "active")
                        .map((customer) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Yeni Müştəri
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Yeni Müştəri Əlavə Et</DialogTitle>
                        <DialogDescription>Müştəri məlumatlarını daxil edin</DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="customer-name">Ad</Label>
                          <Input
                            id="customer-name"
                            value={customerDraft.name}
                            onChange={(event) => setCustomerDraft((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Müştəri adı"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customer-phone">Telefon</Label>
                          <Input
                            id="customer-phone"
                            value={customerDraft.phone}
                            onChange={(event) => setCustomerDraft((current) => ({ ...current, phone: event.target.value }))}
                            placeholder="+994 XX XXX XX XX"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customer-email">E-poçt</Label>
                          <Input
                            id="customer-email"
                            value={customerDraft.email}
                            onChange={(event) => setCustomerDraft((current) => ({ ...current, email: event.target.value }))}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customer-address">Ünvan</Label>
                          <Textarea
                            id="customer-address"
                            value={customerDraft.address}
                            onChange={(event) => setCustomerDraft((current) => ({ ...current, address: event.target.value }))}
                            placeholder="Ünvan"
                          />
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCustomerOpen(false)}>
                          Ləğv et
                        </Button>
                        <Button onClick={createCustomer}>Əlavə et</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedCustomerData && (
                  <div className="mt-4 rounded-lg bg-muted p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Telefon</p>
                        <p className="font-medium">{selectedCustomerData.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Mövcud Borc</p>
                        <p className={`font-medium ${selectedCustomerData.total_debt > 0 ? "text-destructive" : "text-emerald-600"}`}>
                          {formatCurrency(selectedCustomerData.total_debt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Məhsul Əlavə Et</CardTitle>
                <CardDescription>Satışa daxil ediləcək məhsulları seçin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Məhsul seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProducts.map((product) => {
                        const stockCount = saleType === "cash"
                          ? Number(product.stock?.real_quantity ?? 0)
                          : Number(product.stock?.official_quantity ?? 0)

                        return (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name} ({stockCount} ədəd)
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                    className="w-full md:w-28"
                    placeholder="Miqdar"
                  />

                  <Button onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Əlavə et
                  </Button>
                </div>

                {items.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Məhsul</TableHead>
                          <TableHead className="text-center">Miqdar</TableHead>
                          <TableHead className="text-right">Vahid Qiymət</TableHead>
                          <TableHead className="text-right">Cəmi</TableHead>
                          <TableHead className="text-right">Stok</TableHead>
                          {saleType === "official" ? <TableHead className="text-center">Rəsmi stok çıxışı</TableHead> : null}
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{item.availableStock} ədəd</Badge>
                            </TableCell>
                            {saleType === "official" ? (
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    checked={item.stockType === "official"}
                                    onCheckedChange={(checked) => {
                                      try {
                                        toggleOfficialItemStockOutput(item.productId, Boolean(checked))
                                      } catch (error) {
                                        setErrorMessage(error instanceof Error ? error.message : "Stok çıxışı yenilənmədi.")
                                      }
                                    }}
                                  />
                                  <Badge variant={item.stockType === "official" ? "default" : "secondary"}>
                                    {item.stockType === "official" ? "Çıxılsın" : "Çıxılmasın"}
                                  </Badge>
                                </div>
                              </TableCell>
                            ) : null}
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeItem(item.productId)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-lg border py-8 text-center">
                    <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">Məhsul əlavə edilməyib</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Satış Parametrləri</CardTitle>
                <CardDescription>Satış növü, ödəniş və qeyd məlumatları</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Satış Növü</Label>
                    <Select value={saleType} onValueChange={updateSaleType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Nağd Satış</SelectItem>
                        <SelectItem value="official">Rəsmi Satış</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ödəniş Metodu</Label>
                    <Select value={paymentMethod} onValueChange={(value: "cash" | "bank") => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Nağd Kassa</SelectItem>
                        <SelectItem value="bank">Bank Hesabı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ödəniş Statusu</Label>
                    <Select value={paymentStatus} onValueChange={(value: "paid" | "partial" | "debt") => setPaymentStatus(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Tam Ödənilib</SelectItem>
                        <SelectItem value="partial">Qismən Ödənilib</SelectItem>
                        <SelectItem value="debt">Borc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Satış Tarixi</Label>
                    <Input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} />
                  </div>
                </div>

                {paymentStatus === "partial" && (
                  <div className="space-y-2">
                    <Label>Ödənilən Məbləğ (AZN)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={subtotal}
                      value={paidAmount}
                      onChange={(event) => setPaidAmount(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}

                {saleType === "cash" ? (
                  <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="stockOutput"
                        checked={stockOutput}
                        onCheckedChange={(checked) => setStockOutput(Boolean(checked))}
                      />
                      <Label htmlFor="stockOutput" className="cursor-pointer">Stokdan çıxılsın</Label>
                    </div>
                    <Badge variant={stockOutput ? "default" : "secondary"}>
                      {stockOutput ? "Real stok azalacaq" : "Stok dəyişməyəcək"}
                    </Badge>
                  </div>
                ) : (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium">Rəsmi satışda məhsul-bazlı stok çıxışı aktivdir</p>
                        <p className="text-sm text-muted-foreground">
                          Hər məhsul sətrində ayrıca seçə bilərsiniz: hansı məhsul rəsmi stokdan çıxsın, hansı çıxmasın.
                        </p>
                      </div>
                      <Badge variant="outline">
                        {items.filter((item) => item.stockType === "official").length} məhsul stokdan çıxacaq
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Qeyd</Label>
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Satış haqqında qeyd..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Sifariş Xülasəsi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Məhsul sayı</span>
                    <span>{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ara cəm</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ödənilən</span>
                    <span>{formatCurrency(paidAmountValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Borc qalığı</span>
                    <span className={debtAmount > 0 ? "text-destructive" : ""}>{formatCurrency(debtAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Cəmi</span>
                      <span className="text-chart-1">{formatCurrency(subtotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={saleType === "cash" ? "secondary" : "default"}>
                      {saleType === "cash" ? "Nağd" : "Rəsmi"}
                    </Badge>
                    <Badge variant="outline">{paymentMethod === "cash" ? "Nağd Kassa" : "Bank"}</Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      paymentStatus === "paid"
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : paymentStatus === "partial"
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-destructive/50 bg-destructive/10 text-destructive"
                    }
                  >
                    {paymentStatus === "paid" ? "Tam Ödəniş" : paymentStatus === "partial" ? "Qismən Ödəniş" : "Borc"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Satış Davranışı</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>Pul {paymentMethod === "cash" ? "nağd kassaya" : "bank hesabına"} daxil olacaq.</div>
                <div>{stockOutput ? (saleType === "cash" ? "Real stok azalacaq." : "Rəsmi stok azalacaq.") : "Stok qalığı dəyişməyəcək."}</div>
                {paymentStatus !== "paid" && <div>Müştəri üçün borc qeydi yaradılacaq.</div>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4">
                <Button className="w-full" size="lg" disabled={items.length === 0 || isSubmitting} onClick={submitSale}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Satışı Təsdiqlə
                </Button>
                <Link href="/sales">
                  <Button variant="outline" className="w-full">Ləğv et</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}
