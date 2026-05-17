export type ImportTarget = "products" | "sales" | "purchases"

export type ImportFieldDefinition = {
  key: string
  label: string
  required?: boolean
  description: string
  aliases: string[]
  supported?: boolean
}

export type PreviewStatus = "valid" | "warning" | "error" | "duplicate"

export type ColumnMapping = {
  column: string
  normalizedColumn: string
  fieldKey: string | null
  fieldLabel: string | null
  source: "heuristic" | "ai" | "unmapped"
  confidence: number
  supported: boolean
}

export type PreviewRow = {
  rowNumber: number
  status: PreviewStatus
  errors: string[]
  warnings: string[]
  raw: Record<string, string>
  normalized: Record<string, string | number | boolean | null>
  entityLabel: string
  groupKey?: string
}

export type AiAnalysisSummary = {
  enabled: boolean
  used: boolean
  model: string | null
  note: string
}

export type PreviewTotals = {
  totalRows: number
  validRows: number
  warningRows: number
  errorRows: number
  duplicateRows: number
  importableRows: number
}

export type ImportPreviewPayload = {
  target: ImportTarget
  fileName: string
  sheetName: string
  headers: string[]
  mappings: ColumnMapping[]
  unmappedColumns: string[]
  rows: PreviewRow[]
  totals: PreviewTotals
  ai: AiAnalysisSummary
}

export type ImportCommitResult = {
  created: number
  skipped_duplicates: number
  skipped_errors: number
  message: string
}
