import { NextResponse } from "next/server"
import { disconnectWhatsAppClient, snapshot } from "@/lib/server/whatsapp-web"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  await disconnectWhatsAppClient()
  return NextResponse.json(snapshot())
}
