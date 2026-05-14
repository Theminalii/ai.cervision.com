"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Building2,
  Calendar,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
  Truck,
} from "lucide-react"

type Purchase = {
  id: number
  purchase_number: string
  supplier: {
    id: number
    name: string
    phone: string
    address: string | null
    total_debt: number
  } | null
  payment_method: "cash" | "bank"
  total_amount: number
  paid_amount: number
  debt_amount: number
  road_cost: number
  customs_cost: number
  purchase_date: string
  note: string | null
  items: Array<{
    id: number
    product_id: number
    product_name: string
    order_quantity: number
    actual_received_quantity: number
    purchase_price: number
    distributed_extra_cost: number
    final_unit_cost: number
    total_cost: number
  }>
}

type Supplier = {
  id: number
  name: string
  phone: string
  address: string | null
  total_debt: number
  status: "active" | "passive"
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

export default function PurchasesPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-purchases-web")
      setToken(activeToken)
      await loadData(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Satınalma məlumatları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async (activeToken: string) => {
    const [purchasesResponse, suppliersResponse] = await Promise.all([
      backendFetch("/purchases?per_page=200", activeToken),
      backendFetch("/suppliers?per_page=200&sort=id&direction=asc", activeToken),
    ])

    const purchasesJson = await purchasesResponse.json()
    const suppliersJson = await suppliersResponse.json()

    setPurchases(purchasesJson.data ?? [])
    setSuppliers(suppliersJson.data ?? [])
  }

  const filteredPurchases = useMemo(() => {
    const loweredQuery = searchQuery.toLowerCase()
    return purchases.filter((purchase) => {
      const matchesSearch =
        (purchase.supplier?.name ?? "").toLowerCase().includes(loweredQuery) ||
        purchase.purchase_number.toLowerCase().includes(loweredQuery)
      const matchesPayment = paymentFilter === "all" || purchase.payment_method === paymentFilter
      return matchesSearch && matchesPayment
    })
  }, [paymentFilter, purchases, searchQuery])

  const totalPurchases = useMemo(
    () => purchases.reduce((sum, purchase) => sum + purchase.total_amount, 0),
    [purchases],
  )
  const cashPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.payment_method === "cash").reduce((sum, purchase) => sum + purchase.total_amount, 0),
    [purchases],
  )
  const bankPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.payment_method === "bank").reduce((sum, purchase) => sum + purchase.total_amount, 0),
    [purchases],
  )
  const totalShipping = useMemo(
    () => purchases.reduce((sum, purchase) => sum + purchase.road_cost, 0),
    [purchases],
  )

  const indebtedSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.total_debt > 0).sort((a, b) => b.total_debt - a.total_debt),
    [suppliers],
  )

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Satınalma" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Satınalma məlumatları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Satınalma" />

      <div className="flex-1 p-6 space-y-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<Truck className="h-5 w-5 text-chart-1" />} value={formatCurrency(totalPurchases)} label="Cəmi Satınalma" className="bg-chart-1/10" />
          <StatCard icon={<Package className="h-5 w-5 text-chart-2" />} value={formatCurrency(cashPurchases)} label="Nağd Ödəniş" className="bg-chart-2/10" />
          <StatCard icon={<CreditCard className="h-5 w-5 text-chart-5" />} value={formatCurrency(bankPurchases)} label="Bank Ödənişi" className="bg-chart-5/10" />
          <StatCard icon={<Truck className="h-5 w-5 text-warning" />} value={formatCurrency(totalShipping)} label="Yol Xərcləri" className="bg-warning/10" />
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Satınalma Siyahısı</CardTitle>
                <CardDescription>Bütün satınalma əməliyyatlarını izləyin</CardDescription>
              </div>
              <Link href="/purchases/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Satınalma
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Təchizatçı və ya nömrə axtar..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
              </div>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ödəniş Növü" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün Növlər</SelectItem>
                  <SelectItem value="cash">Nağd</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nömrə</TableHead>
                    <TableHead>Tarix</TableHead>
                    <TableHead>Təchizatçı</TableHead>
                    <TableHead className="text-center">Məhsul Sayı</TableHead>
                    <TableHead>Ödəniş Növü</TableHead>
                    <TableHead className="text-right">Yol Pulu</TableHead>
                    <TableHead className="text-right">Gömrük</TableHead>
                    <TableHead className="text-right">Cəmi</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono">{purchase.purchase_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {purchase.purchase_date}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{purchase.supplier?.name ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{purchase.items.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={purchase.payment_method === "cash" ? "secondary" : "default"}>
                          {purchase.payment_method === "cash" ? "Nağd" : "Bank"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(purchase.road_cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(purchase.customs_cost)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(purchase.total_amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedPurchase(purchase)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPurchases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                        Filterə uyğun satınalma tapılmadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Təchizatçı Borcları</CardTitle>
            <CardDescription>Backend-dən gələn aktual kreditor borcları</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Təchizatçı</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="text-right">Qalıq Borc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {indebtedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      {formatCurrency(supplier.total_debt)}
                    </TableCell>
                  </TableRow>
                ))}
                {indebtedSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      Hazırda təchizatçı borcu yoxdur.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!selectedPurchase} onOpenChange={() => setSelectedPurchase(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Satınalma Detalları {selectedPurchase?.purchase_number}</SheetTitle>
            <SheetDescription>
              {selectedPurchase?.purchase_date} tarixli satınalma əməliyyatı
            </SheetDescription>
          </SheetHeader>
          {selectedPurchase && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{selectedPurchase.supplier?.name ?? "-"}</p>
                  <p className="text-sm text-muted-foreground">Təchizatçı</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Məhsullar</p>
                <div className="divide-y rounded-lg border">
                  {selectedPurchase.items.map((product) => (
                    <div key={product.id} className="p-3">
                      <p className="font-medium">{product.product_name}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sifariş: </span>
                          <Badge variant="secondary">{product.order_quantity}</Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Daxil olan: </span>
                          <Badge
                            variant="outline"
                            className={product.actual_received_quantity < product.order_quantity ? "border-warning/50 bg-warning/10" : ""}
                          >
                            {product.actual_received_quantity}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Alış: </span>
                          <span className="font-medium">{formatCurrency(product.purchase_price)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vahid maya: </span>
                          <span className="font-medium">{formatCurrency(product.final_unit_cost)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Ödənilən</span><span>{formatCurrency(selectedPurchase.paid_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Borc</span><span className={selectedPurchase.debt_amount > 0 ? "text-destructive font-semibold" : ""}>{formatCurrency(selectedPurchase.debt_amount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Yol pulu</span><span>{formatCurrency(selectedPurchase.road_cost)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gömrük</span><span>{formatCurrency(selectedPurchase.customs_cost)}</span></div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Cəmi</span>
                      <span>{formatCurrency(selectedPurchase.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedPurchase.note && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Qeyd</p>
                  <p className="mt-1">{selectedPurchase.note}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  className,
}: {
  icon: React.ReactNode
  value: string
  label: string
  className: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`rounded-lg p-2 ${className}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
