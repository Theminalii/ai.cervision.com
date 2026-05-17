"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Building2, Clock3, Mail, MapPin, Phone, Wallet } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CrmPageHeader, CrmStatusBadge } from "@/components/crm/crm-shared"
import { crmFetch, formatCurrency, formatDate, type CrmCustomer } from "@/lib/crm"

type CustomerProfilePayload = {
  data: CrmCustomer & {
    sales: Array<{ id: number; sale_number: string; sale_date: string; total_amount: number; payment_status: string }>
    contacts: Array<{ id: number; first_name: string; last_name?: string | null; phone?: string | null; email?: string | null; job_title?: string | null }>
    deals: Array<{ id: number; title: string; expected_amount?: number | null; stage?: { name: string; key: string } | null; owner?: { name: string } | null }>
    tasks: Array<{ id: number; title: string; status: string; deadline?: string | null; owner?: { name: string } | null }>
    activities: Array<{ id: number; type: string; title: string; description?: string | null; created_at?: string | null; user?: { name: string } | null }>
    debts: Array<{ id: number; type: string; amount: number; transaction_date: string; note?: string | null }>
  }
}

export function CrmCustomerProfilePage() {
  const params = useParams<{ id: string }>()
  const [payload, setPayload] = useState<CustomerProfilePayload["data"] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await crmFetch<CustomerProfilePayload>(`/customers/${params.id}`)
          setPayload(response.data)
        } catch (err) {
          setError(err instanceof Error ? err.message : "Müştəri profili yüklənmədi.")
        }
      })()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [params.id])

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader
          title={payload?.name ?? "Müştəri profili"}
          description="Customer 360 görünüşü: satış, borc, kontaktlar, fəaliyyət və açıq deal-lar."
        />

        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}

        {payload ? (
          <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Müştəri məlumatı</CardTitle>
                  <CardDescription>Əsas profil və segment məlumatı</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <CrmStatusBadge value={payload.crm_status} />
                    {payload.tags?.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{payload.phone}</div>
                    <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{payload.email ?? "Email yoxdur"}</div>
                    <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{payload.address ?? "Ünvan yoxdur"}</div>
                    <div className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" />{payload.company?.name ?? "Şirkət bağlı deyil"}</div>
                    <div className="flex items-center gap-2"><Clock3 className="size-4 text-muted-foreground" />Son əlaqə: {formatDate(payload.last_contact_at)}</div>
                    <div className="flex items-center gap-2"><Wallet className="size-4 text-muted-foreground" />Borc: {formatCurrency(payload.total_debt)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Kontakt şəxslər</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {payload.contacts.length ? payload.contacts.map((contact) => (
                    <div key={contact.id} className="rounded-2xl border px-4 py-3">
                      <p className="font-medium">{contact.first_name} {contact.last_name ?? ""}</p>
                      <p className="text-sm text-muted-foreground">{contact.job_title ?? "Vəzifə yoxdur"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{contact.phone ?? "Telefon yoxdur"} • {contact.email ?? "Email yoxdur"}</p>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">Kontakt bağlı deyil.</p>}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Satış və borc görünüşü</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Lifetime value</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(payload.lifetime_value ?? 0)}</p></div>
                  <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Satış sayı</p><p className="mt-2 text-2xl font-semibold">{payload.sales_count ?? 0}</p></div>
                  <div className="rounded-2xl border p-4"><p className="text-sm text-muted-foreground">Növbəti addım</p><p className="mt-2 text-sm font-medium">{payload.next_action ?? "Plan yoxdur"}</p></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Açıq deal-lar və task-lar</CardTitle></CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    {payload.deals.map((deal) => (
                      <div key={deal.id} className="rounded-2xl border px-4 py-3">
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-sm text-muted-foreground">{deal.stage?.name ?? "Mərhələ yoxdur"} • {formatCurrency(deal.expected_amount ?? 0)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {payload.tasks.map((task) => (
                      <div key={task.id} className="rounded-2xl border px-4 py-3">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.status} • {formatDate(task.deadline)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Fəaliyyət tarixçəsi</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {payload.activities.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border-l-2 border-primary/50 bg-muted/30 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{activity.title}</p>
                        <Badge variant="outline">{activity.type}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{activity.description ?? "Əlavə qeyd yoxdur"}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDate(activity.created_at, { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </>
  )
}
