"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, BriefcaseBusiness, CircleDollarSign, Clock3, Target, TrendingUp, Users } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CrmPageHeader, CrmRecommendationCard, CrmStatCard } from "@/components/crm/crm-shared"
import { crmFetch, formatCurrency, type CrmOverview } from "@/lib/crm"

export function CrmDashboardPage() {
  const [data, setData] = useState<CrmOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const response = await crmFetch<CrmOverview>("/overview")
          setData(response)
        } catch (err) {
          setError(err instanceof Error ? err.message : "CRM dashboard yüklənmədi.")
        } finally {
          setLoading(false)
        }
      })()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const healthScore = data
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            40 +
              data.conversion_rate * 0.35 +
              Math.max(0, 20 - data.overdue_tasks * 2) +
              Math.max(0, 20 - data.follow_up_waiting * 1.5),
          ),
        ),
      )
    : 0

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader
          title="CRM Dashboard"
          description="Lead, deal, follow-up və müştəri davranışını bir yerdən izləyin. Bu panel satış komandasının gündəlik qərarlarını sürətləndirmək üçün hazırlanıb."
        />

        {error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 text-sm text-rose-700">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CrmStatCard title="Ümumi müştəri" value={String(data?.total_customers ?? 0)} hint="CRM üzrə əlaqəli müştərilər" icon={<Users className="size-5" />} />
          <CrmStatCard title="Aktiv lead" value={String(data?.new_leads ?? 0)} hint="Hazırda açıq yeni lead-lər" icon={<Target className="size-5" />} />
          <CrmStatCard title="Açıq deal" value={String(data?.open_deals ?? 0)} hint="Pipeline üzərində işlənən fürsətlər" icon={<BriefcaseBusiness className="size-5" />} />
          <CrmStatCard title="Gözlənilən gəlir" value={formatCurrency(data?.expected_revenue ?? 0)} hint="Probability-weighted forecast" icon={<CircleDollarSign className="size-5" />} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <CrmStatCard title="Konversiya" value={`${data?.conversion_rate ?? 0}%`} hint="Lead-dən qazanılmış nəticə" icon={<TrendingUp className="size-5" />} />
              <CrmStatCard title="Follow-up gözləyən" value={String(data?.follow_up_waiting ?? 0)} hint="Bu gün gecikmiş təmaslar" icon={<Clock3 className="size-5" />} />
              <CrmStatCard title="Gecikmiş task" value={String(data?.overdue_tasks ?? 0)} hint="Komandanın diqqət tələb edən task-ları" icon={<AlertTriangle className="size-5" />} />
            </div>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Ən dəyərli müştərilər</CardTitle>
                <CardDescription>Satış və lifetime value əsasında ilk 5 müştəri.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.top_customers ?? []).map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(customer.lifetime_value ?? 0)}</p>
                      <p className="text-xs text-muted-foreground">{customer.sales_count ?? 0} satış</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border/70 bg-slate-950 text-white">
              <CardHeader>
                <CardDescription className="text-slate-300">Business Health Score</CardDescription>
                <CardTitle className="text-5xl">{loading ? "..." : `${healthScore}`}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400" style={{ width: `${healthScore}%` }} />
                </div>
                <p className="text-sm text-slate-300">
                  Skor konversiya, açıq follow-up intizamı və gecikmiş tapşırıqların səviyyəsinə görə hesablanır.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Əsas AI tövsiyələri</CardTitle>
                <CardDescription>Prioritet risk və fürsətlər real CRM datasına əsasən sıralanıb.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-1">
                {(data?.ai_recommendations ?? []).length ? (
                  data?.ai_recommendations.map((item, index) => (
                    <CrmRecommendationCard key={`${item.title}-${index}`} item={item} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    Tövsiyə yaratmaq üçün hələ kifayət qədər CRM əməliyyatı toplanmayıb.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
