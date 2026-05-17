import { NextResponse } from "next/server"
import { listWhatsAppChats, snapshot, startWhatsAppClient } from "@/lib/server/whatsapp-web"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await startWhatsAppClient().catch(() => null)
    const data = await listWhatsAppChats()
    return NextResponse.json({ status: snapshot().status, data })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "WhatsApp chat-ları alınmadı.", status: snapshot().status },
      { status: 422 },
    )
  }
}
