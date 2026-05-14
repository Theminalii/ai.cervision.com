"use client"

import { ChangeEvent, Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Upload } from "lucide-react"

type Category = {
  id: number
  name: string
}

type Brand = {
  id: number
  name: string
}

type ProductForm = {
  product_code: string
  name: string
  category_id: string
  brand_id: string
  description: string
  cash_sale_price: string
  official_sale_price: string
  price_type: "automatic" | "manual"
  cost_price: string
  initial_real_quantity: string
  initial_official_quantity: string
  minimum_stock: string
  is_active: boolean
}

type ProductResponse = {
  id: number
  product_code: string
  name: string
  description: string | null
  image: string | null
  cash_sale_price: number
  official_sale_price: number
  price_type: "automatic" | "manual"
  cost_price: number
  is_active: boolean
  minimum_stock: number
  category: { id: number; name: string } | null
  brand: { id: number; name: string } | null
  stock: {
    real_quantity: number
    official_quantity: number
    minimum_quantity: number
  } | null
}

const emptyForm: ProductForm = {
  product_code: "",
  name: "",
  category_id: "",
  brand_id: "",
  description: "",
  cash_sale_price: "",
  official_sale_price: "",
  price_type: "automatic",
  cost_price: "",
  initial_real_quantity: "0",
  initial_official_quantity: "0",
  minimum_stock: "0",
  is_active: true,
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<ProductFormLoading />}>
      <ProductFormPage />
    </Suspense>
  )
}

function ProductFormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get("edit")
  const isEditMode = Boolean(editId)

  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    void bootstrap()
  }, [editId])

  const title = useMemo(() => (isEditMode ? "Məhsulu Redaktə Et" : "Yeni Məhsul"), [isEditMode])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-products-form-web")
      setToken(activeToken)

      const [categoriesResponse, brandsResponse] = await Promise.all([
        backendFetch("/categories", activeToken),
        backendFetch("/brands", activeToken),
      ])

      const categoriesJson = await categoriesResponse.json()
      const brandsJson = await brandsResponse.json()

      setCategories(categoriesJson.data ?? [])
      setBrands(brandsJson.data ?? [])

      if (editId) {
        const productResponse = await backendFetch(`/products/${editId}`, activeToken)
        const productJson = await productResponse.json()
        const product = (productJson.data ?? productJson) as ProductResponse

        setForm({
          product_code: product.product_code,
          name: product.name,
          category_id: String(product.category?.id ?? ""),
          brand_id: String(product.brand?.id ?? ""),
          description: product.description ?? "",
          cash_sale_price: String(product.cash_sale_price),
          official_sale_price: String(product.official_sale_price),
          price_type: product.price_type,
          cost_price: String(product.cost_price),
          initial_real_quantity: String(product.stock?.real_quantity ?? 0),
          initial_official_quantity: String(product.stock?.official_quantity ?? 0),
          minimum_stock: String(product.minimum_stock),
          is_active: product.is_active,
        })
        setImagePreview(product.image)
      } else {
        setForm(emptyForm)
        setImageFile(null)
        setImagePreview(null)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Məhsul formu yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const saveProduct = async () => {
    if (!token) return

    setErrorMessage(null)
    setSaveMessage(null)
    setIsSaving(true)

    try {
      const payload = {
        product_code: form.product_code,
        name: form.name,
        description: form.description || null,
        category_id: Number(form.category_id),
        brand_id: Number(form.brand_id),
        cash_sale_price: Number(form.cash_sale_price),
        official_sale_price: Number(form.official_sale_price),
        price_type: form.price_type,
        cost_price: Number(form.cost_price),
        is_active: form.is_active,
        minimum_stock: Number(form.minimum_stock),
        initial_real_quantity: Number(form.initial_real_quantity),
        initial_official_quantity: Number(form.initial_official_quantity),
      }

      const response = await backendFetch(
        isEditMode ? `/products/${editId}` : "/products",
        token,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      )

      const json = await response.json()
      const product = (json.data ?? json) as ProductResponse

      if (imageFile) {
        const formData = new FormData()
        formData.append("image", imageFile)
        await backendFetch(`/products/${product.id}/image`, token, {
          method: "POST",
          body: formData,
        })
      }

      setSaveMessage(isEditMode ? "Məhsul uğurla yeniləndi." : "Məhsul uğurla yaradıldı.")
      router.push(`/products/${product.id}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Məhsul yadda saxlanmadı.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title={title} />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Məhsul formu yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={title} />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/products">
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
                <CardTitle>Əsas Məlumatlar</CardTitle>
                <CardDescription>Məhsulun əsas məlumatlarını daxil edin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Məhsul Kodu *</Label>
                    <Input id="code" value={form.product_code} onChange={(event) => updateForm("product_code", event.target.value)} placeholder="TKR-001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Məhsul Adı *</Label>
                    <Input id="name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="Məhsul adını daxil edin" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kateqoriya *</Label>
                    <Select value={form.category_id} onValueChange={(value) => updateForm("category_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kateqoriya seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Brend / Marka *</Label>
                    <Select value={form.brand_id} onValueChange={(value) => updateForm("brand_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Brend seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={String(brand.id)}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Təsvir</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    placeholder="Məhsul haqqında əlavə məlumat..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Qiymət Məlumatları</CardTitle>
                <CardDescription>Satış qiymətlərini və maya dəyərini təyin edin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Maya Dəyəri (AZN) *</Label>
                    <Input id="costPrice" type="number" step="0.01" value={form.cost_price} onChange={(event) => updateForm("cost_price", event.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashPrice">Nağd Satış Qiyməti (AZN) *</Label>
                    <Input id="cashPrice" type="number" step="0.01" value={form.cash_sale_price} onChange={(event) => updateForm("cash_sale_price", event.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officialPrice">Rəsmi Satış Qiyməti (AZN) *</Label>
                    <Input id="officialPrice" type="number" step="0.01" value={form.official_sale_price} onChange={(event) => updateForm("official_sale_price", event.target.value)} placeholder="0.00" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Qiymət Növü *</Label>
                  <Select value={form.price_type} onValueChange={(value: "automatic" | "manual") => updateForm("price_type", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Qiymət növünü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Avtomatik - Sistem əmsallara görə hesablayır</SelectItem>
                      <SelectItem value="manual">Manual - Qiymət dəyişdirilə bilər</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Avtomatik seçildikdə də qiymət saxlanılır, amma pricing modulunda əmsallarla yenilənə bilər.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stok Məlumatları</CardTitle>
                <CardDescription>Başlanğıc və ya cari stok dəyərlərini təyin edin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="realStock">Real Stok</Label>
                    <Input id="realStock" type="number" step="0.001" value={form.initial_real_quantity} onChange={(event) => updateForm("initial_real_quantity", event.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officialStock">Rəsmi Stok</Label>
                    <Input id="officialStock" type="number" step="0.001" value={form.initial_official_quantity} onChange={(event) => updateForm("initial_official_quantity", event.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minStock">Minimum Stok *</Label>
                    <Input id="minStock" type="number" step="0.001" value={form.minimum_stock} onChange={(event) => updateForm("minimum_stock", event.target.value)} placeholder="5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Məhsul Şəkli</CardTitle>
                <CardDescription>Məhsul üçün şəkil yükləyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageChange} />
                  <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Məhsul şəkli" className="mx-auto mb-4 h-40 w-full rounded-lg object-cover" />
                    ) : (
                      <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    )}
                    <p className="mb-1 text-sm font-medium">Şəkil yükləyin</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP - Maksimum 2MB</p>
                    <div className="mt-4 inline-flex items-center text-sm text-primary">
                      <Upload className="mr-2 h-4 w-4" />
                      Fayl seç
                    </div>
                  </div>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>Məhsulun aktiv/passiv statusu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Aktiv</p>
                    <p className="text-sm text-muted-foreground">Məhsul satışa açıq olsun</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(checked) => updateForm("is_active", checked)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <Button className="w-full" size="lg" onClick={saveProduct} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isEditMode ? "Məhsulu Yenilə" : "Məhsulu Əlavə Et"}
                </Button>
                <Link href="/products">
                  <Button variant="outline" className="mt-2 w-full">Ləğv et</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductFormLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Yeni Məhsul" />
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Məhsul formu yüklənir...
        </div>
      </div>
    </div>
  )
}
