"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CrmPageHeader } from "@/components/crm/crm-shared"
import { crmFetch, formatCurrency, type CrmReports } from "@/lib/crm"

export function CrmReportsPage() {
  const [data, setData] = useState<CrmReports | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await crmFetch<CrmReports>("/reports")
          setData(response)
        } catch (err) {
          setError(err instanceof Error ? err.message : "CRM hesabatları yüklənmədi.")
        }
      })()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="CRM Hesabatları" description="Pipeline, conversion, işçi performansı və müştəri aktivliyi üzrə qərarverici görünüş." />
        {error ? <Card className="border-rose-200 bg-rose-50"><CardContent className="p-4 text-sm text-rose-700">{error}</CardContent></Card> : null}
        {data ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Lead conversion</p><p className="mt-2 text-2xl font-semibold">{data.lead_conversion.total ? Math.round((data.lead_conversion.won / data.lead_conversion.total) * 100) : 0}%</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Expected revenue</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(data.expected_revenue)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Passiv müştəri</p><p className="mt-2 text-2xl font-semibold">{data.passive_customers.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">İtirilmiş səbəblər</p><p className="mt-2 text-2xl font-semibold">{data.lost_reasons.length}</p></CardContent></Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Pipeline hesabatı</CardTitle><CardDescription>Mərhələlər üzrə say və məbləğ</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {data.pipeline.map((row) => (
                    <div key={row.stage} className="rounded-2xl border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{row.stage}</p>
                        <p className="text-sm text-muted-foreground">{row.count} deal</p>
                      </div>
                      <p className="mt-2 text-lg font-semibold">{formatCurrency(row.expected_amount)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>İşçi performansı</CardTitle><CardDescription>Won deal və task yükü müqayisəsi</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  {data.employee_performance.map((row) => (
                    <div key={row.owner_user_id} className="rounded-2xl border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{row.owner_name}</p>
                        <p className="text-sm text-muted-foreground">{row.won} won / {row.deals} deal</p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{row.tasks} task • {formatCurrency(row.expected_revenue)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Ən dəyərli müştərilər</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {data.valuable_customers.map((customer) => (
                    <div key={customer.id} className="rounded-2xl border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{customer.name}</p>
                        <p className="font-semibold">{formatCurrency(customer.lifetime_value ?? 0)}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{customer.sales_count ?? 0} satış • son əlaqə {customer.last_contact_at?.slice(0, 10) ?? "-"}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Aylıq CRM performansı</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {data.monthly_performance.map((row) => (
                    <div key={row.month} className="rounded-2xl border px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{row.month}</p>
                        <p className="text-sm text-muted-foreground">{row.deals} deal / {row.leads} lead</p>
                      </div>
                      <p className="text-sm text-muted-foreground">Won deal: {row.won_deals}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </main>
    </>
  )
}
