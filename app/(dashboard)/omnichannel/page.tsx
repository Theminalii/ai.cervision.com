"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { omniFetch } from "@/lib/omnichannel"

export default function OmnichannelPage() {
  const [summary, setSummary] = useState<{ inbox_count: number; new_count: number; human_required_count: number } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void omniFetch<{ summary: { inbox_count: number; new_count: number; human_required_count: number } }>("/omnichannel/settings")
        .then((json) => setSummary(json.summary))
        .catch(() => setSummary(null))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">Omnichannel AI Assistant</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">WhatsApp və Instagram mesajlarını vahid inbox-da toplayın, ERP/CRM datasına əsaslanan AI cavab təklifləri yaradın və operator handoff axınını idarə edin.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link href="/omnichannel/inbox">Inbox-a keç</Link></Button>
            <Button asChild variant="outline"><Link href="/omnichannel/inbox-pro">Inbox Pro</Link></Button>
            <Button asChild variant="outline"><Link href="/settings/ai">AI Ayarları</Link></Button>
            <Button asChild variant="outline"><Link href="/settings/whatsapp">WhatsApp Ayarları</Link></Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Conversation sayı</p><p className="mt-2 text-3xl font-semibold">{summary?.inbox_count ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Yeni mesajlar</p><p className="mt-2 text-3xl font-semibold">{summary?.new_count ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Operator tələb edən</p><p className="mt-2 text-3xl font-semibold">{summary?.human_required_count ?? 0}</p></CardContent></Card>
        </div>
      </main>
    </>
  )
}
