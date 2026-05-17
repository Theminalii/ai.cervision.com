import { NextRequest, NextResponse } from "next/server"
import { sendWhatsAppMessage } from "@/lib/server/whatsapp-web"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const recipient = String(body.recipient ?? "")
    const message = String(body.body ?? "")

    if (!recipient || !message) {
      return NextResponse.json({ message: "Recipient və mesaj tələb olunur." }, { status: 422 })
    }

    const result = await sendWhatsAppMessage(recipient, message)

    return NextResponse.json({ data: result })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "WhatsApp mesajı göndərilmədi." },
      { status: 422 },
    )
  }
}
