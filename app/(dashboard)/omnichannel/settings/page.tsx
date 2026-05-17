import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const links = [
  { href: "/settings/ai", title: "AI Ayarları" },
  { href: "/settings/whatsapp", title: "WhatsApp Ayarları" },
  { href: "/settings/gmail", title: "Mail Ayarları" },
  { href: "/settings/instagram", title: "Instagram Ayarları" },
  { href: "/settings/ai-automation", title: "Avtomatik Cavab Qaydaları" },
  { href: "/settings/ai-logs", title: "AI Logları" },
]

export default function Page() {
  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Omnichannel Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">AI, WhatsApp, Mail və Instagram inteqrasiya ayarlarını bu bölmədən idarə edin.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {links.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition hover:border-primary hover:bg-primary/5">
                <CardHeader><CardTitle className="text-lg">{item.title}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">Detallı konfiqurasiya ekranına keçin.</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
