import { NextRequest, NextResponse } from "next/server"
import { listWhatsAppMessages, snapshot, startWhatsAppClient } from "@/lib/server/whatsapp-web"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ chatId: string }> },
) {
  try {
    await startWhatsAppClient().catch(() => null)
    const { chatId } = await context.params
    const data = await listWhatsAppMessages(decodeURIComponent(chatId))
    return NextResponse.json({ status: snapshot().status, data })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "WhatsApp mesajları alınmadı.", status: snapshot().status },
      { status: 422 },
    )
  }
}
