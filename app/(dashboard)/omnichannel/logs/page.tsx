import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <>
      <Header />
      <main className="space-y-4 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Omnichannel Logs</h1>
        <p className="text-sm text-muted-foreground">AI usage və omnichannel log-ları AI Logs bölməsindən izlənir.</p>
        <Button asChild><Link href="/settings/ai-logs">AI Logs səhifəsinə keç</Link></Button>
      </main>
    </>
  )
}
