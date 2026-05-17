import { NextResponse } from "next/server"
import { buildImportPreview } from "@/lib/excel-import/server"
import type { ImportTarget } from "@/lib/excel-import/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const target = String(formData.get("target") ?? "") as ImportTarget
    const backendToken = request.headers.get("x-backend-token") ?? ""

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Excel faylı göndərilməyib." }, { status: 400 })
    }

    if (!["products", "sales", "purchases"].includes(target)) {
      return NextResponse.json({ message: "Import target düzgün deyil." }, { status: 400 })
    }

    if (!backendToken) {
      return NextResponse.json({ message: "Backend token tapılmadı." }, { status: 401 })
    }

    const preview = await buildImportPreview({
      fileName: file.name,
      buffer: await file.arrayBuffer(),
      target,
      backendToken,
    })

    return NextResponse.json(preview)
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Excel preview hazırlana bilmədi." },
      { status: 500 },
    )
  }
}
