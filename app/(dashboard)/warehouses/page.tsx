"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  Edit,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  Trash2,
  TrendingUp,
  Warehouse,
} from "lucide-react"

type WarehouseItem = {
  id: number
  name: string
  code: string
  address: string | null
  capacity: number
  used_capacity: number
  available_capacity: number
  utilization_percent: number
  manager_name: string | null
  status: "active" | "passive"
  transfers_from?: WarehouseTransfer[]
  transfers_to?: WarehouseTransfer[]
}

type WarehouseTransfer = {
  id: number
  from_warehouse: WarehouseItem | null
  to_warehouse: WarehouseItem | null
  quantity: number
  note: string | null
  transfer_date: string
}

type WarehouseForm = {
  id?: number
  name: string
  code: string
  address: string
  capacity: string
  used_capacity: string
  manager_name: string
  status: "active" | "passive"
}

const today = new Date().toISOString().slice(0, 10)

const emptyWarehouseForm = (): WarehouseForm => ({
  name: "",
  code: "",
  address: "",
  capacity: "0",
  used_capacity: "0",
  manager_name: "",
  status: "active",
})

export default function WarehousesPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([])
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [warehouseForm, setWarehouseForm] = useState<WarehouseForm>(emptyWarehouseForm())
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseItem | null>(null)
  const [transferForm, setTransferForm] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    quantity: "",
    note: "",
    transfer_date: today,
  })

  useEffect(() => {
    void bootstrap()
  }, [])

  const bootstrap = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-warehouses-web")
      setToken(activeToken)
      await loadData(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Anbar məlumatları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadData = async (activeToken: string) => {
    const [warehousesResponse, transfersResponse] = await Promise.all([
      backendFetch("/warehouses?per_page=200", activeToken),
      backendFetch("/warehouse-transfers?per_page=200", activeToken),
    ])

    const warehousesJson = await warehousesResponse.json()
    const transfersJson = await transfersResponse.json()

    setWarehouses(warehousesJson.data ?? [])
    setTransfers(transfersJson.data ?? [])
  }

  const totalCapacity = useMemo(
    () => warehouses.reduce((sum, warehouse) => sum + warehouse.capacity, 0),
    [warehouses],
  )
  const totalUsed = useMemo(
    () => warehouses.reduce((sum, warehouse) => sum + warehouse.used_capacity, 0),
    [warehouses],
  )
  const overallUtilization = totalCapacity > 0 ? ((totalUsed / totalCapacity) * 100).toFixed(1) : "0.0"

  const openCreateDialog = () => {
    setWarehouseForm(emptyWarehouseForm())
    setWarehouseDialogOpen(true)
  }

  const openEditDialog = (warehouse: WarehouseItem) => {
    setWarehouseForm({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address ?? "",
      capacity: String(warehouse.capacity),
      used_capacity: String(warehouse.used_capacity),
      manager_name: warehouse.manager_name ?? "",
      status: warehouse.status,
    })
    setWarehouseDialogOpen(true)
  }

  const openDetailDialog = async (warehouse: WarehouseItem) => {
    if (!token) return

    try {
      const response = await backendFetch(`/warehouses/${warehouse.id}`, token)
      const json = await response.json()
      setSelectedWarehouse(json.data ?? json)
      setDetailDialogOpen(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Anbar detalları yüklənmədi.")
    }
  }

  const openTransferDialog = (warehouse?: WarehouseItem) => {
    setTransferForm({
      from_warehouse_id: warehouse ? String(warehouse.id) : "",
      to_warehouse_id: "",
      quantity: "",
      note: "",
      transfer_date: today,
    })
    setTransferDialogOpen(true)
  }

  const saveWarehouse = async () => {
    if (!token) return

    setIsSaving(true)
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await backendFetch(
        warehouseForm.id ? `/warehouses/${warehouseForm.id}` : "/warehouses",
        token,
        {
          method: warehouseForm.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: warehouseForm.name,
            code: warehouseForm.code,
            address: warehouseForm.address || null,
            capacity: Number(warehouseForm.capacity),
            used_capacity: Number(warehouseForm.used_capacity),
            manager_name: warehouseForm.manager_name || null,
            status: warehouseForm.status,
          }),
        },
      )

      setWarehouseDialogOpen(false)
      setSaveMessage(warehouseForm.id ? "Anbar yeniləndi." : "Yeni anbar yaradıldı.")
      await loadData(token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Anbar yadda saxlanmadı.")
    } finally {
      setIsSaving(false)
    }
  }

  const deleteWarehouse = async (warehouseId: number) => {
    if (!token) return

    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await backendFetch(`/warehouses/${warehouseId}`, token, { method: "DELETE" })
      setSaveMessage("Anbar silindi.")
      await loadData(token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Anbar silinmədi.")
    }
  }

  const submitTransfer = async () => {
    if (!token) return

    setIsSaving(true)
    setErrorMessage(null)
    setSaveMessage(null)

    try {
      await backendFetch("/warehouses/transfer", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_warehouse_id: Number(transferForm.from_warehouse_id),
          to_warehouse_id: Number(transferForm.to_warehouse_id),
          quantity: Number(transferForm.quantity),
          note: transferForm.note || null,
          transfer_date: transferForm.transfer_date,
        }),
      })

      setTransferDialogOpen(false)
      setSaveMessage("Anbar transferi qeydə alındı.")
      await loadData(token)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transfer qeydə alınmadı.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Anbarlar yüklənir...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anbarlar</h1>
          <p className="text-muted-foreground">Anbar yerləşmələrini idarə edin</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Anbar
        </Button>
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

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Ümumi Anbarlar" icon={<Warehouse className="h-4 w-4 text-muted-foreground" />} value={String(warehouses.length)} meta="Aktiv yerləşmələr" />
        <SummaryCard title="Ümumi Tutum" icon={<Package className="h-4 w-4 text-muted-foreground" />} value={totalCapacity.toLocaleString()} meta="ədəd məhsul" />
        <SummaryCard title="İstifadə Olunan" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} value={totalUsed.toLocaleString()} meta={`${overallUtilization}% doluluq`} />
        <SummaryCard title="Boş Yer" icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} value={(totalCapacity - totalUsed).toLocaleString()} meta="ədəd üçün yer" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((warehouse) => {
          const utilization = warehouse.utilization_percent
          const isNearFull = utilization > 80
          const isFull = utilization > 95

          return (
            <Card key={warehouse.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      isFull ? "bg-red-100 text-red-600" :
                      isNearFull ? "bg-yellow-100 text-yellow-600" :
                      "bg-primary/10 text-primary"
                    }`}>
                      <Warehouse className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {warehouse.address ?? "Ünvan daxil edilməyib"}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void openDetailDialog(warehouse)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Baxış
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openTransferDialog(warehouse)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transfer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(warehouse)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Redaktə
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => void deleteWarehouse(warehouse.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Kod:</span>
                  <Badge variant="outline">{warehouse.code}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Doluluq</span>
                    <span className={`font-medium ${
                      isFull ? "text-red-600" :
                      isNearFull ? "text-yellow-600" :
                      "text-green-600"
                    }`}>
                      {utilization.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={utilization}
                    className={`h-2 ${
                      isFull ? "[&>div]:bg-red-500" :
                      isNearFull ? "[&>div]:bg-yellow-500" :
                      "[&>div]:bg-green-500"
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{warehouse.used_capacity.toLocaleString()} istifadə</span>
                    <span>{warehouse.capacity.toLocaleString()} tutum</span>
                  </div>
                </div>

                {isFull && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-sm text-red-600 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Anbar demək olar ki doludur!</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Məsul:</span>
                  <span className="font-medium">{warehouse.manager_name ?? "Təyin edilməyib"}</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => void openDetailDialog(warehouse)}>
                    <Package className="mr-1 h-4 w-4" />
                    Baxış
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openTransferDialog(warehouse)}>
                    <ArrowRightLeft className="mr-1 h-4 w-4" />
                    Transfer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{warehouseForm.id ? "Anbarı Redaktə Et" : "Yeni Anbar Əlavə Et"}</DialogTitle>
            <DialogDescription>Anbar məlumatlarını daxil edin</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormField label="Anbar adı">
              <Input value={warehouseForm.name} onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))} placeholder="Mərkəzi Anbar" />
            </FormField>
            <FormField label="Anbar kodu">
              <Input value={warehouseForm.code} onChange={(event) => setWarehouseForm((current) => ({ ...current, code: event.target.value }))} placeholder="WH-001" />
            </FormField>
            <FormField label="Ünvan">
              <Input value={warehouseForm.address} onChange={(event) => setWarehouseForm((current) => ({ ...current, address: event.target.value }))} placeholder="Bakı, Binəqədi" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Tutum (ədəd)">
                <Input type="number" step="0.001" value={warehouseForm.capacity} onChange={(event) => setWarehouseForm((current) => ({ ...current, capacity: event.target.value }))} placeholder="10000" />
              </FormField>
              <FormField label="İstifadə olunan">
                <Input type="number" step="0.001" value={warehouseForm.used_capacity} onChange={(event) => setWarehouseForm((current) => ({ ...current, used_capacity: event.target.value }))} placeholder="5000" />
              </FormField>
            </div>
            <FormField label="Məsul şəxs">
              <Input value={warehouseForm.manager_name} onChange={(event) => setWarehouseForm((current) => ({ ...current, manager_name: event.target.value }))} placeholder="Ad Soyad" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={saveWarehouse} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yadda saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anbar Transferi</DialogTitle>
            <DialogDescription>İstifadə olunan tutumu bir anbardan digərinə köçürün</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormField label="Göndərən anbar">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transferForm.from_warehouse_id}
                onChange={(event) => setTransferForm((current) => ({ ...current, from_warehouse_id: event.target.value }))}
              >
                <option value="">Seçin</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Qəbul edən anbar">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={transferForm.to_warehouse_id}
                onChange={(event) => setTransferForm((current) => ({ ...current, to_warehouse_id: event.target.value }))}
              >
                <option value="">Seçin</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Miqdar">
                <Input type="number" step="0.001" value={transferForm.quantity} onChange={(event) => setTransferForm((current) => ({ ...current, quantity: event.target.value }))} />
              </FormField>
              <FormField label="Tarix">
                <Input type="date" value={transferForm.transfer_date} onChange={(event) => setTransferForm((current) => ({ ...current, transfer_date: event.target.value }))} />
              </FormField>
            </div>
            <FormField label="Qeyd">
              <Textarea value={transferForm.note} onChange={(event) => setTransferForm((current) => ({ ...current, note: event.target.value }))} placeholder="Transfer səbəbi" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={submitTransfer} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Transfer et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedWarehouse?.name}</DialogTitle>
            <DialogDescription>{selectedWarehouse?.code} üzrə detallı baxış</DialogDescription>
          </DialogHeader>
          {selectedWarehouse && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Ünvan" value={selectedWarehouse.address ?? "Daxil edilməyib"} />
                <InfoRow label="Məsul şəxs" value={selectedWarehouse.manager_name ?? "Təyin edilməyib"} />
                <InfoRow label="Tutum" value={selectedWarehouse.capacity.toLocaleString()} />
                <InfoRow label="İstifadə olunan" value={selectedWarehouse.used_capacity.toLocaleString()} />
              </div>

              <div>
                <h3 className="mb-3 font-medium">Transfer tarixçəsi</h3>
                <div className="space-y-2">
                  {transfers
                    .filter((transfer) =>
                      transfer.from_warehouse?.id === selectedWarehouse.id ||
                      transfer.to_warehouse?.id === selectedWarehouse.id,
                    )
                    .slice(0, 10)
                    .map((transfer) => (
                      <div key={transfer.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex justify-between">
                          <span>{transfer.from_warehouse?.name} → {transfer.to_warehouse?.name}</span>
                          <span className="font-medium">{transfer.quantity}</span>
                        </div>
                        <div className="mt-1 text-muted-foreground">{transfer.transfer_date}</div>
                        {transfer.note && <div className="mt-1">{transfer.note}</div>}
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => openEditDialog(selectedWarehouse)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Redaktə et
                </Button>
                <Link href="/stock" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Package className="mr-2 h-4 w-4" />
                    Stok səhifəsi
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  title,
  icon,
  value,
  meta,
}: {
  title: string
  icon: React.ReactNode
  value: string
  meta: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </CardContent>
    </Card>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}
