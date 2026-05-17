"use client"

import { useState } from "react"
import { FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ExcelImportModal } from "@/components/import/excel-import-modal"
import type { ImportTarget } from "@/lib/excel-import/types"

type ExcelImportButtonProps = {
  target: ImportTarget
  token: string | null
  onImported?: () => Promise<void> | void
}

export function ExcelImportButton({ target, token, onImported }: ExcelImportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Excel Import
      </Button>
      <ExcelImportModal open={open} onOpenChange={setOpen} target={target} token={token} onImported={onImported} />
    </>
  )
}
