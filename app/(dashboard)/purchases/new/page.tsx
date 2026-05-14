"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Truck,
} from "lucide-react"

type Product = {
  id: number
  name: string
  product_code: string
  cost_price: number
  category: { id: number; name: string } | null
  brand: { id: number; name: string } | null
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

type PurchaseItem = {
  productId: number
  productName: string
  orderQty: number
  receivedQty: number
  unitPrice: number
  total: number
}

const today = new Date().toISOString().slice(0, 10)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

export default function NewPurchasePage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>("")
  const [paymentType, setPaymentType] = useState<"cash" | "bank">("cash")
  const [paidAmount, setPaidAmount] = useState<string>("0")
  const [shippingCost, setShippingCost] = useState<string>("0")
  const [customsCost, setCustomsCost] = useState<string>("0")
  const [purchaseDate, setPurchaseDate] = useState(today)
  const [note, setNote] = useState("")
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [orderQty, setOrderQty] = useState<number>(1)
  const [receivedQty, setReceivedQty] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<number>(0)

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-purchases-new-web")
      setToken(activeToken)

      const [productsResponse, suppliersResponse] = await Promise.all([
        backendFetch("/products?per_page=300&sort=name&direction=asc", activeToken),
        backendFetch("/suppliers?per_page=200&sort=id&direction=asc", activeToken),
      ])

      const productsJson = await productsResponse.json()
      const suppliersJson = await suppliersResponse.json()

      setProducts(productsJson.data ?? [])
      setSuppliers(suppliersJson.data ?? [])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satınalma formu yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    setErrorMessage(null)

    if (!selectedProduct) {
      setErrorMessage("Əvvəlcə məhsul seçin.")
      return
    }

    if (orderQty <= 0) {
      setErrorMessage("Sifariş miqdarı 0-dan böyük olmalıdır.")
      return
    }

    if (receivedQty < 0 || receivedQty > orderQty) {
      setErrorMessage("Daxil olan miqdar 0 ilə sifariş miqdarı arasında olmalıdır.")
      return
    }

    if (unitPrice <= 0) {
      setErrorMessage("Alış qiyməti 0-dan böyük olmalıdır.")
      return
    }

    const product = products.find((item) => item.id === Number(selectedProduct))
    if (!product) {
      setErrorMessage("Seçilmiş məhsul tapılmadı.")
      return
    }

    setItems((current) => {
      const existingIndex = current.findIndex((item) => item.productId === product.id)
      const nextItem: PurchaseItem = {
        productId: product.id,
        productName: product.name,
        orderQty,
        receivedQty,
        unitPrice,
        total: roundMoney(unitPrice * orderQty),
      }

      if (existingIndex >= 0) {
        const updated = [...current]
        updated[existingIndex] = nextItem
        return updated
      }

      return [...current, nextItem]
    })

    setSelectedProduct("")
    setOrderQty(1)
    setReceivedQty(1)
    setUnitPrice(0)
  }

  const removeItem = (productId: number) => {
    setItems((current) => current.filter((item) => item.productId !== productId))
  }

  const productTotal = useMemo(
    () => roundMoney(items.reduce((sum, item) => sum + item.total, 0)),
    [items],
  )

  const shippingCostValue = Number(shippingCost) || 0
  const customsCostValue = Number(customsCost) || 0
  const paidAmountValue = Number(paidAmount) || 0
  const additionalCosts = roundMoney(shippingCostValue + customsCostValue)
  const grandTotal = roundMoney(productTotal + additionalCosts)
  const debtAmount = Math.max(0, roundMoney(grandTotal - paidAmountValue))

  const getDistributedCost = (item: PurchaseItem) => {
    if (productTotal === 0 || item.orderQty === 0) return 0
    const proportion = item.total / productTotal
    return roundMoney((additionalCosts * proportion) / item.orderQty)
  }

  const selectedSupplierData = suppliers.find((supplier) => supplier.id === Number(selectedSupplier)) ?? null

  const submitPurchase = async () => {
    if (!token) return

    setErrorMessage(null)
    setSaveMessage(null)

    if (!selectedSupplier) {
      setErrorMessage("Təchizatçı seçilməlidir.")
      return
    }

    if (items.length === 0) {
      setErrorMessage("Ən azı bir məhsul əlavə edin.")
      return
    }

    if (paidAmountValue < 0) {
      setErrorMessage("Ödənilən məbləğ mənfi ola bilməz.")
      return
    }

    if (paidAmountValue > grandTotal) {
      setErrorMessage("Ödənilən məbləğ toplam məbləği aşa bilməz.")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await backendFetch("/purchases", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: Number(selectedSupplier),
          payment_method: paymentType,
          paid_amount: paidAmountValue,
          road_cost: shippingCostValue,
          customs_cost: customsCostValue,
          purchase_date: purchaseDate,
          note: note || null,
          items: items.map((item) => ({
            product_id: item.productId,
            order_quantity: item.orderQty,
            actual_received_quantity: item.receivedQty,
            purchase_price: item.unitPrice,
          })),
        }),
      })

      const json = await response.json()
      const purchase = json.data ?? json
      setSaveMessage(`Satınalma yaradıldı: ${purchase.purchase_number}`)
      router.push("/purchases")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satınalma yaradılmadı.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Yeni Satınalma" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Satınalma formu yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Yeni Satınalma" />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/purchases">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Geri
            </Button>
          </Link>
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
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Təchizatçı Seçimi</CardTitle>
                <CardDescription>Satınalma üçün təchizatçı seçin</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Təchizatçı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter((supplier) => supplier.status === "active")
                      .map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {selectedSupplierData && (
                  <div className="mt-4 rounded-lg bg-muted p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Telefon</p>
                        <p className="font-medium">{selectedSupplierData.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Mövcud Borc</p>
                        <p className={`font-medium ${selectedSupplierData.total_debt > 0 ? "text-destructive" : "text-success"}`}>
                          {formatCurrency(selectedSupplierData.total_debt)}
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
                <CardDescription>Satınalmaya məhsul əlavə edin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Məhsul</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={(value) => {
                        setSelectedProduct(value)
                        const product = products.find((item) => item.id === Number(value))
                        if (product) {
                          setUnitPrice(Number(product.cost_price) || 0)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Məhsul seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name} ({product.product_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sifariş Miqdarı</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.001"
                      value={orderQty}
                      onChange={(event) => {
                        const value = Number(event.target.value) || 1
                        setOrderQty(value)
                        setReceivedQty((current) => Math.min(current, value))
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Daxil Olan</Label>
                    <Input
                      type="number"
                      min="0"
                      max={orderQty}
                      step="0.001"
                      value={receivedQty}
                      onChange={(event) => setReceivedQty(Number(event.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Alış Qiyməti (AZN)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(Number(event.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Əlavə et
                    </Button>
                  </div>
                </div>

                {items.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Məhsul</TableHead>
                          <TableHead className="text-center">Sifariş</TableHead>
                          <TableHead className="text-center">Daxil</TableHead>
                          <TableHead className="text-right">Vahid Qiymət</TableHead>
                          <TableHead className="text-right">Vahid Maya</TableHead>
                          <TableHead className="text-right">Cəmi</TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="text-center"><Badge variant="secondary">{item.orderQty}</Badge></TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={item.receivedQty < item.orderQty ? "border-warning/50 bg-warning/10" : ""}
                              >
                                {item.receivedQty}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice + getDistributedCost(item))}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(item.total)}</TableCell>
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
                <CardTitle>Əlavə Xərclər</CardTitle>
                <CardDescription>Yol pulu və gömrükləmə xərclərini daxil edin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Yol Pulu (AZN)</Label>
                    <Input type="number" step="0.01" value={shippingCost} onChange={(event) => setShippingCost(event.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gömrükləmə Xərci (AZN)</Label>
                    <Input type="number" step="0.01" value={customsCost} onChange={(event) => setCustomsCost(event.target.value)} placeholder="0.00" />
                  </div>
                </div>

                {additionalCosts > 0 && items.length > 0 && (
                  <div className="mt-4 rounded-lg bg-muted p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Xərclər məhsullara mütənasib paylanacaq</p>
                    <div className="space-y-1 text-sm">
                      {items.map((item) => (
                        <div key={item.productId} className="flex justify-between">
                          <span>{item.productName}</span>
                          <span className="font-medium">
                            +{formatCurrency(getDistributedCost(item) * item.orderQty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ödəniş Parametrləri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ödəniş Növü</Label>
                    <Select value={paymentType} onValueChange={(value: "cash" | "bank") => setPaymentType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Nağd</SelectItem>
                        <SelectItem value="bank">Bank Köçürməsi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ödənilən Məbləğ</Label>
                    <Input type="number" step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarix</Label>
                    <Input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Qeyd</Label>
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Satınalma haqqında qeyd..." />
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
                    <span className="text-muted-foreground">Məhsul cəmi</span>
                    <span>{formatCurrency(productTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Yol pulu</span>
                    <span>{formatCurrency(shippingCostValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gömrükləmə</span>
                    <span>{formatCurrency(customsCostValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ödənilən</span>
                    <span>{formatCurrency(paidAmountValue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Qalıq borc</span>
                    <span className={debtAmount > 0 ? "text-destructive" : ""}>{formatCurrency(debtAmount)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Cəmi</span>
                      <span className="text-chart-1">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <Badge variant={paymentType === "cash" ? "secondary" : "default"}>
                    {paymentType === "cash" ? "Nağd Ödəniş" : "Bank Köçürməsi"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4" />
                  Stok Təsiri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-info" />
                  <span><strong>Rəsmi stok:</strong> Sifariş miqdarı qədər artır</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span><strong>Real stok:</strong> Faktiki daxil olan miqdar qədər artır</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 p-4">
                <Button className="w-full" size="lg" disabled={items.length === 0 || isSubmitting} onClick={submitPurchase}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Satınalmanı Təsdiqlə
                </Button>
                <Link href="/purchases">
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
