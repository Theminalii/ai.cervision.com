import { NextResponse } from "next/server"
import { startWhatsAppClient, snapshot } from "@/lib/server/whatsapp-web"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  await startWhatsAppClient()
  return NextResponse.json(snapshot())
}
