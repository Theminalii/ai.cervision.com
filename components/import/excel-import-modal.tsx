"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload, XCircle } from "lucide-react"
import { backendFetch } from "@/lib/backend-api"
import { importTargetConfigs } from "@/lib/excel-import/config"
import type { ImportPreviewPayload, ImportTarget } from "@/lib/excel-import/types"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ExcelImportModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: ImportTarget
  token: string | null
  onImported?: () => Promise<void> | void
}

export function ExcelImportModal({ open, onOpenChange, target, token, onImported }: ExcelImportModalProps) {
  const config = importTargetConfigs[target]
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewPayload | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const importableRows = useMemo(
    () => preview?.rows.filter((row) => row.status === "valid" || row.status === "warning") ?? [],
    [preview],
  )
  const problemRows = useMemo(
    () => preview?.rows.filter((row) => row.status === "error" || row.status === "duplicate") ?? [],
    [preview],
  )

  const reset = () => {
    setFile(null)
    setPreview(null)
    setErrorMessage(null)
    setIsPreviewing(false)
    setIsImporting(false)
  }

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset()
    }
    onOpenChange(nextOpen)
  }

  const runPreview = async () => {
    if (!file) {
      setErrorMessage("Əvvəlcə Excel faylı seçin.")
      return
    }

    if (!token) {
      setErrorMessage("Backend token tapılmadı.")
      return
    }

    setIsPreviewing(true)
    setErrorMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("target", target)

      const response = await fetch("/api/excel-import/preview", {
        method: "POST",
        headers: {
          "x-backend-token": token,
        },
        body: formData,
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json?.message ?? "Excel preview hazırlana bilmədi.")
      }

      setPreview(json as ImportPreviewPayload)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel preview hazırlana bilmədi."
      setErrorMessage(message)
      toast({
        title: "Preview alınmadı",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsPreviewing(false)
    }
  }

  const commitImport = async () => {
    if (!preview || !token) return

    if (importableRows.length === 0) {
      setErrorMessage("Import ediləcək uyğun sətir tapılmadı.")
      return
    }

    setIsImporting(true)
    setErrorMessage(null)

    try {
      const response = await backendFetch(`/import/${target}/excel`, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importableRows.map((row) => row.normalized),
        }),
      })

      const json = await response.json()
      toast({
        title: "Excel import tamamlandı",
        description: json.message ?? `${json.created ?? 0} qeyd əlavə edildi.`,
      })

      await onImported?.()
      close(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Excel import tamamlanmadı."
      setErrorMessage(message)
      toast({
        title: "Import alınmadı",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fayl Yüklə</CardTitle>
              <CardDescription>`.xlsx` və ya `.xls` faylını seçin, sonra preview yaradın.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  setErrorMessage(null)
                  setPreview(null)
                  setFile(event.target.files?.[0] ?? null)
                }}
              />
              <Button onClick={() => void runPreview()} disabled={!file || isPreviewing}>
                {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Preview hazırla
              </Button>
            </CardContent>
          </Card>

          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {preview && (
            <>
              <div className="grid gap-4 md:grid-cols-5">
                <StatTile label="Sətir" value={String(preview.totals.totalRows)} tone="default" />
                <StatTile label="Hazır" value={String(preview.totals.importableRows)} tone="success" />
                <StatTile label="Xəbərdarlıq" value={String(preview.totals.warningRows)} tone="warning" />
                <StatTile label="Səhv" value={String(preview.totals.errorRows)} tone="danger" />
                <StatTile label="Dublikat" value={String(preview.totals.duplicateRows)} tone="muted" />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI Analiz
                  </CardTitle>
                  <CardDescription>{preview.ai.note}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-sm">
                  <Badge variant={preview.ai.used ? "default" : "secondary"}>
                    {preview.ai.used ? `AI aktiv${preview.ai.model ? ` • ${preview.ai.model}` : ""}` : "Heuristik mapping"}
                  </Badge>
                  <Badge variant="outline">{preview.fileName}</Badge>
                  <Badge variant="outline">{preview.sheetName}</Badge>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tapılan Sütunlar</CardTitle>
                    <CardDescription>Sütunların uyğunlaşdırılması və dəstək statusu</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-0">
                    <ScrollArea className="h-72 rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Excel sütunu</TableHead>
                            <TableHead>Sahə</TableHead>
                            <TableHead>Mənbə</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {preview.mappings.map((mapping) => (
                            <TableRow key={mapping.column}>
                              <TableCell className="font-medium">{mapping.column}</TableCell>
                              <TableCell>
                                {mapping.fieldLabel ? (
                                  <div className="flex items-center gap-2">
                                    <span>{mapping.fieldLabel}</span>
                                    {!mapping.supported && <Badge variant="secondary">yalnız analiz</Badge>}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Uyğun sahə tapılmadı</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={mapping.source === "ai" ? "default" : mapping.source === "heuristic" ? "secondary" : "outline"}>
                                  {mapping.source}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Problemli Sətirlər</CardTitle>
                    <CardDescription>Import edilməyəcək sətirlər və səbəbləri</CardDescription>
                  </CardHeader>
                  <CardContent className="min-h-0">
                    <ScrollArea className="h-72 rounded-md border">
                      <div className="space-y-3 p-3">
                        {problemRows.length === 0 && (
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
                            Problemli sətir tapılmadı.
                          </div>
                        )}
                        {problemRows.slice(0, 20).map((row) => (
                          <div key={row.rowNumber} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium">Sətir {row.rowNumber} • {row.entityLabel}</div>
                              <Badge variant="destructive">{row.status}</Badge>
                            </div>
                            <div className="mt-2 space-y-1 text-sm text-destructive">
                              {row.errors.map((error) => (
                                <div key={error} className="flex items-start gap-2">
                                  <XCircle className="mt-0.5 h-4 w-4" />
                                  <span>{error}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <Card className="min-h-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Import Ediləcək Sətirlər</CardTitle>
                  <CardDescription>Doğrulanmış və ya xəbərdarlıqlı sətirlər</CardDescription>
                </CardHeader>
                <CardContent className="min-h-0">
                  <ScrollArea className="h-80 rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sətir</TableHead>
                          <TableHead>Qeyd</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Qeydlər</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importableRows.slice(0, 50).map((row) => (
                          <TableRow key={row.rowNumber}>
                            <TableCell className="font-mono">{row.rowNumber}</TableCell>
                            <TableCell className="font-medium">{row.entityLabel}</TableCell>
                            <TableCell>
                              <Badge variant={row.status === "warning" ? "secondary" : "default"}>
                                {row.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {row.warnings.length === 0 ? (
                                <span className="text-sm text-muted-foreground">Hazırdır</span>
                              ) : (
                                <div className="space-y-1 text-sm text-amber-700">
                                  {row.warnings.map((warning) => (
                                    <div key={warning} className="flex items-start gap-2">
                                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                                      <span>{warning}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Bağla</Button>
          <Button onClick={() => void commitImport()} disabled={!preview || importableRows.length === 0 || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            İmportu təsdiqlə
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: "default" | "success" | "warning" | "danger" | "muted" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
        : tone === "danger"
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : tone === "muted"
            ? "border-border bg-muted/40 text-muted-foreground"
            : "border-border bg-card text-foreground"

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
