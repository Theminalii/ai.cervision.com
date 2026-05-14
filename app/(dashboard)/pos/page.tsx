"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { API_BASE, backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  User,
  ShoppingCart,
  Barcode,
  Calculator,
  Receipt,
  Check,
  Percent,
  Tag,
  Loader2,
  UserPlus,
} from "lucide-react"

type ResourceResponse<T> = { data?: T[] }

type Category = {
  id: number
  name: string
  children?: Category[]
}

type Customer = {
  id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  total_debt: number
  status: "active" | "passive"
}

type Product = {
  id: number
  product_code: string
  name: string
  image: string | null
  cash_sale_price: number
  official_sale_price: number
  is_active: boolean
  category: { id: number; name: string } | null
  stock: {
    real_quantity: number
    official_quantity: number
    minimum_quantity: number
  } | null
}

type CartItem = {
  id: number
  name: string
  image: string | null
  productCode: string
  price: number
  quantity: number
  availableStock: number
}

type CustomerForm = {
  name: string
  phone: string
  email: string
  address: string
}

const currentDate = () => new Date().toISOString().slice(0, 10)

const emptyCustomerForm = (): CustomerForm => ({
  name: "",
  phone: "",
  email: "",
  address: "",
})

const unwrapCollection = <T,>(payload: T[] | ResourceResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}

const flattenCategories = (items: Category[]) =>
  items.flatMap((item) => [item, ...(item.children ? flattenCategories(item.children) : [])])

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

function buildAssetUrl(path: string | null) {
  if (!path) return null
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path
  const origin = new URL(API_BASE).origin
  return path.startsWith("/") ? `${origin}${path}` : `${origin}/${path}`
}

export default function POSPage() {
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([{ id: "all", name: "Hamısı" }])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [discount, setDiscount] = useState(0)
  const [saleType, setSaleType] = useState<"cash" | "official">("cash")
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "partial" | "debt">("paid")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash")
  const [stockOutput, setStockOutput] = useState(true)
  const [paidAmount, setPaidAmount] = useState("")
  const [receivedAmount, setReceivedAmount] = useState("")
  const [note, setNote] = useState("")
  const [saleDate, setSaleDate] = useState(currentDate())
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm())

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    setPaymentMethod(saleType === "cash" ? "cash" : "bank")
    setCart((current) =>
      current.map((item) => {
        const product = products.find((entry) => entry.id === item.id)
        if (!product) return item
        return {
          ...item,
          price: saleType === "cash" ? Number(product.cash_sale_price) : Number(product.official_sale_price),
          availableStock: saleType === "cash"
            ? Number(product.stock?.real_quantity ?? 0)
            : Number(product.stock?.official_quantity ?? 0),
        }
      }),
    )
  }, [products, saleType])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const token = await ensureBackendToken("bestsol-pos-web")
      const [productsResponse, customersResponse, categoriesResponse] = await Promise.all([
        backendFetch("/products?per_page=400&sort=id&direction=asc", token),
        backendFetch("/customers?per_page=400&sort=id&direction=asc", token),
        backendFetch("/categories", token),
      ])

      const productsJson = await productsResponse.json()
      const customersJson = await customersResponse.json()
      const categoriesJson = await categoriesResponse.json()

      const categoryItems = flattenCategories(unwrapCollection<Category>(categoriesJson))
      setProducts(productsJson.data ?? [])
      setCustomers(customersJson.data ?? [])
      setCategories([
        { id: "all", name: "Hamısı" },
        ...categoryItems.map((category) => ({ id: String(category.id), name: category.name })),
      ])
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "POS məlumatları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return products.filter((product) => {
      if (!product.is_active) return false
      const matchesSearch =
        product.name.toLowerCase().includes(term) ||
        product.product_code.toLowerCase().includes(term)
      const matchesCategory =
        selectedCategory === "all" || String(product.category?.id ?? "") === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  )

  const discountAmount = useMemo(
    () => (subtotal * discount) / 100,
    [discount, subtotal],
  )

  const total = useMemo(
    () => Math.max(0, Number((subtotal - discountAmount).toFixed(2))),
    [discountAmount, subtotal],
  )

  const debtAmount = useMemo(() => {
    if (paymentStatus === "paid") return 0
    if (paymentStatus === "debt") return total
    return Math.max(0, Number((total - (Number(paidAmount) || 0)).toFixed(2)))
  }, [paidAmount, paymentStatus, total])

  const change = useMemo(
    () => Math.max(0, Number((Number(receivedAmount || 0) - total).toFixed(2))),
    [receivedAmount, total],
  )

  const addToCart = (product: Product) => {
    const price = saleType === "cash" ? Number(product.cash_sale_price) : Number(product.official_sale_price)
    const availableStock = saleType === "cash"
      ? Number(product.stock?.real_quantity ?? 0)
      : Number(product.stock?.official_quantity ?? 0)

    if (stockOutput && availableStock <= 0) {
      toast({
        title: "Stok yoxdur",
        description: `${product.name} üçün mövcud stok qalmayıb.`,
        variant: "destructive",
      })
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        const nextQuantity = existing.quantity + 1
        if (stockOutput && nextQuantity > availableStock) {
          toast({
            title: "Stok kifayət deyil",
            description: `${product.name} üçün maksimum ${availableStock} ədəd çıxıla bilər.`,
            variant: "destructive",
          })
          return current
        }
        return current.map((item) => item.id === product.id ? { ...item, quantity: nextQuantity, price, availableStock } : item)
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          image: buildAssetUrl(product.image),
          productCode: product.product_code,
          price,
          quantity: 1,
          availableStock,
        },
      ]
    })
  }

  const updateQuantity = (id: number, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) return item
          const nextQuantity = item.quantity + delta
          if (nextQuantity <= 0) return null
          if (stockOutput && nextQuantity > item.availableStock) {
            toast({
              title: "Stok kifayət deyil",
              description: `${item.name} üçün maksimum ${item.availableStock} ədəd mövcuddur.`,
              variant: "destructive",
            })
            return item
          }
          return { ...item, quantity: nextQuantity }
        })
        .filter(Boolean) as CartItem[],
    )
  }

  const removeFromCart = (id: number) => {
    setCart((current) => current.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setCart([])
    setDiscount(0)
    setPaymentStatus("paid")
    setPaidAmount("")
    setReceivedAmount("")
    setSelectedCustomer("")
    setNote("")
  }

  const openPayment = () => {
    if (cart.length === 0) {
      toast({
        title: "Səbət boşdur",
        description: "Əvvəlcə məhsul əlavə edin.",
        variant: "destructive",
      })
      return
    }
    setIsPaymentDialogOpen(true)
  }

  const saveDraft = () => {
    const payload = {
      cart,
      discount,
      saleType,
      paymentStatus,
      paymentMethod,
      stockOutput,
      note,
      selectedCustomer,
      saleDate,
    }
    window.sessionStorage.setItem("bestsol-pos-draft", JSON.stringify(payload))
    toast({ title: "Qaralama saxlanıldı" })
  }

  const switchToDebtMode = () => {
    setPaymentStatus("debt")
    if (!selectedCustomer) {
      toast({
        title: "Müştəri seçin",
        description: "Nisyə satış üçün əvvəlcə müştəri seçilməlidir.",
      })
    }
    openPayment()
  }

  const focusScanner = () => {
    searchRef.current?.focus()
    toast({
      title: "Barkod axtarışı aktivdir",
      description: "Barkodu birbaşa axtarış sahəsinə daxil edə bilərsiniz.",
    })
  }

  const createCustomer = async () => {
    setIsSubmitting(true)
    try {
      const token = await ensureBackendToken("bestsol-pos-customer-create")
      const response = await backendFetch("/customers", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customerForm,
          email: customerForm.email || null,
          address: customerForm.address || null,
          status: "active",
        }),
      })
      const customer = (await response.json()) as Customer
      setCustomers((current) => [customer, ...current])
      setSelectedCustomer(String(customer.id))
      setCustomerForm(emptyCustomerForm())
      setIsAddCustomerOpen(false)
      toast({ title: "Müştəri yaradıldı" })
    } catch (error) {
      toast({
        title: "Müştəri yaradılmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitSale = async () => {
    setIsSubmitting(true)
    try {
      if (cart.length === 0) {
        throw new Error("Səbət boşdur.")
      }

      if ((paymentStatus === "debt" || paymentStatus === "partial") && !selectedCustomer) {
        throw new Error("Borc və ya qismən ödəniş üçün müştəri seçin.")
      }

      if (paymentStatus === "partial" && Number(paidAmount || 0) <= 0) {
        throw new Error("Qismən ödəniş üçün ödənilən məbləği daxil edin.")
      }

      if (paymentStatus === "partial" && Number(paidAmount || 0) >= total) {
        throw new Error("Qismən ödəniş ümumi məbləğdən az olmalıdır.")
      }

      if (paymentStatus === "paid" && paymentMethod === "cash" && Number(receivedAmount || 0) < total) {
        throw new Error("Nağd satışda alınan məbləğ ümumi məbləğdən az ola bilməz.")
      }

      const token = await ensureBackendToken("bestsol-pos-sale-create")
      const response = await backendFetch("/sales", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer ? Number(selectedCustomer) : null,
          sale_type: saleType,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          paid_amount: paymentStatus === "paid" ? total : paymentStatus === "debt" ? 0 : Number(paidAmount || 0),
          stock_output: stockOutput,
          note: note || null,
          sale_date: saleDate,
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: item.price,
            stock_type: stockOutput ? (saleType === "cash" ? "real" : "official") : "none",
          })),
        }),
      })
      const sale = await response.json()
      setIsPaymentDialogOpen(false)
      clearCart()
      toast({
        title: "Satış yaradıldı",
        description: `${sale.sale_number ?? "Yeni satış"} uğurla tamamlandı.`,
      })
      await bootstrap()
      router.push("/sales")
    } catch (error) {
      toast({
        title: "Satış tamamlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="POS" subtitle="Kassa satışları və sürətli əməliyyatlar" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            POS yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="POS" subtitle="Kassa satışları və sürətli əməliyyatlar" />

      <div className="flex-1 p-6">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex h-[calc(100vh-10rem)] gap-4">
          <div className="flex flex-1 flex-col">
            <div className="space-y-4 pb-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={searchRef}
                    placeholder="Məhsul adı və ya barkod..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant={saleType === "cash" ? "default" : "outline"} onClick={() => setSaleType("cash")}>
                  <Banknote className="mr-2 h-4 w-4" />
                  Nağd satış
                </Button>
                <Button variant={saleType === "official" ? "default" : "outline"} onClick={() => setSaleType("official")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Rəsmi satış
                </Button>
                <Button variant="outline" onClick={focusScanner}>
                  <Barcode className="mr-2 h-4 w-4" />
                  Skan
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button key={category.id} variant={selectedCategory === category.id ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(category.id)}>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 pr-2">
              <div className="grid grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const availableStock = saleType === "cash"
                    ? Number(product.stock?.real_quantity ?? 0)
                    : Number(product.stock?.official_quantity ?? 0)

                  return (
                    <Card
                      key={product.id}
                      className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-3">
                        <div className="mb-2 aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {buildAssetUrl(product.image) ? (
                            <img src={buildAssetUrl(product.image) ?? ""} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                          )}
                        </div>
                        <h3 className="truncate text-sm font-medium">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.product_code}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="font-bold text-primary">
                            {formatCurrency(saleType === "cash" ? product.cash_sale_price : product.official_sale_price)}
                          </span>
                          <Badge variant={availableStock > 10 ? "secondary" : "destructive"} className="text-xs">
                            {availableStock} ədəd
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <Card className="w-[400px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Səbət
                  {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-600">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Təmizlə
                  </Button>
                )}
              </div>

              <Select value={selectedCustomer || "guest"} onValueChange={(value) => setSelectedCustomer(value === "guest" ? "" : value)}>
                <SelectTrigger className="mt-2">
                  <User className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Müştəri seç (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guest">Qonaq müştəri</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setIsAddCustomerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Yeni müştəri yarat
              </Button>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col p-0">
              <ScrollArea className="flex-1 px-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShoppingCart className="mb-4 h-12 w-12" />
                    <p>Səbət boşdur</p>
                    <p className="text-sm">Məhsul əlavə etmək üçün klikləyin</p>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-2">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="w-20 text-right">
                          <p className="font-medium">{formatCurrency(item.price * item.quantity)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {cart.length > 0 && (
                <div className="border-t px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Endirim:</span>
                    <div className="ml-auto flex items-center gap-1">
                      <Input
                        type="number"
                        value={discount}
                        onChange={(event) => setDiscount(Math.min(100, Math.max(0, Number(event.target.value) || 0)))}
                        className="h-8 w-16 text-center"
                      />
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t px-4 py-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara cəm:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Endirim ({discount}%):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Cəmi:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="space-y-2 border-t p-4">
                <Button className="h-12 w-full text-lg" disabled={cart.length === 0} onClick={openPayment}>
                  <Calculator className="mr-2 h-5 w-5" />
                  Ödənişə keç
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" disabled={cart.length === 0} onClick={saveDraft}>
                    <Receipt className="mr-1 h-4 w-4" />
                    Saxla
                  </Button>
                  <Button variant="outline" size="sm" disabled={cart.length === 0} onClick={switchToDebtMode}>
                    <User className="mr-1 h-4 w-4" />
                    Nisyə
                  </Button>
                  <Button variant="outline" size="sm" onClick={focusScanner}>
                    <Barcode className="mr-1 h-4 w-4" />
                    Skan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni müştəri</DialogTitle>
            <DialogDescription>POS içindən sürətli müştəri yaradın.</DialogDescription>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCustomerOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void createCustomer()}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Yarat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ödəniş</DialogTitle>
            <DialogDescription>Ödəniş metodunu seçin və əməliyyatı tamamlayın</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="h-20 flex-col"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="mb-1 h-6 w-6" />
                <span>Nağd</span>
              </Button>
              <Button
                variant={paymentMethod === "bank" ? "default" : "outline"}
                className="h-20 flex-col"
                onClick={() => setPaymentMethod("bank")}
              >
                <CreditCard className="mb-1 h-6 w-6" />
                <span>Bank</span>
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Ödəniləcək məbləğ</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
              {paymentStatus !== "paid" && (
                <p className="mt-1 text-sm text-muted-foreground">Qalıq borc: {formatCurrency(debtAmount)}</p>
              )}
            </div>

            <Field label="Ödəniş statusu">
              <div className="flex gap-2">
                <Button variant={paymentStatus === "paid" ? "default" : "outline"} onClick={() => setPaymentStatus("paid")}>Tam</Button>
                <Button variant={paymentStatus === "partial" ? "default" : "outline"} onClick={() => setPaymentStatus("partial")}>Qismən</Button>
                <Button variant={paymentStatus === "debt" ? "default" : "outline"} onClick={() => setPaymentStatus("debt")}>Borc</Button>
              </div>
            </Field>

            {paymentStatus === "partial" && (
              <Field label="Ödənilən məbləğ">
                <Input type="number" step="0.01" value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} />
              </Field>
            )}

            {paymentStatus === "paid" && paymentMethod === "cash" && (
              <Field label="Alınan məbləğ">
                <Input type="number" step="0.01" value={receivedAmount} onChange={(event) => setReceivedAmount(event.target.value)} />
              </Field>
            )}

            {paymentStatus === "paid" && paymentMethod === "cash" && Number(receivedAmount || 0) > 0 && (
              <div className="rounded-lg border bg-success/10 px-4 py-3 text-sm">
                Qaytarılacaq məbləğ: <span className="font-medium">{formatCurrency(change)}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={() => void submitSale()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Təsdiqlə
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}
