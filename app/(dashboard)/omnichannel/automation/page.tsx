import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <>
      <Header />
      <main className="space-y-4 p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Omnichannel Automation</h1>
        <p className="text-sm text-muted-foreground">Bu bölmənin detallı idarəsi AI automation ayarları altında saxlanılır.</p>
        <Button asChild><Link href="/settings/ai-automation">AI Automation səhifəsinə keç</Link></Button>
      </main>
    </>
  )
}
