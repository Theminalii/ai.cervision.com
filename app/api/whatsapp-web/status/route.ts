import { NextResponse } from "next/server"
import { snapshot, startWhatsAppClient } from "@/lib/server/whatsapp-web"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  await startWhatsAppClient().catch(() => null)
  return NextResponse.json(snapshot())
}
