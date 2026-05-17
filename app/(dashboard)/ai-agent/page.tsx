"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Bot, Brain, CheckCircle2, Loader2, Send, ShieldAlert, Sparkles, TrendingUp } from "lucide-react"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Recommendation = {
  title: string
  description: string
  reason: string
  impact_level: "low" | "medium" | "high" | "critical"
  recommended_action: string
  expected_result: string
  module: string
  entity?: { id: number; type: string } | null
  actions?: { apply: string; later: string; reject: string }
}

type Overview = {
  health_score: number
  key_risks: Recommendation[]
  key_opportunities: Recommendation[]
  dashboard_cards: Array<{ title: string; value: number | string; module: string }>
  recommendations: Recommendation[]
  action_suggestions: Recommendation[]
}

type AnalysisSection = Record<string, unknown> & {
  recommendations?: Recommendation[]
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

type ActionDecision = "apply" | "later" | "reject"

const quickQuestions = [
  "Ən çox satılan məhsulum hansıdır?",
  "Hansı məhsula endirim etməliyəm?",
  "Bu ay ən aktiv işçim kimdir?",
  "Hansı təchizatçı daha sərfəlidir?",
  "Ölü stoklarımı göstər",
  "Bu ay nə qədər mənfəət etmişəm?",
  "Mənə satışları artırmaq üçün plan ver",
]

export default function AiAgentPage() {
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [products, setProducts] = useState<AnalysisSection | null>(null)
  const [sales, setSales] = useState<AnalysisSection | null>(null)
  const [purchases, setPurchases] = useState<AnalysisSection | null>(null)
  const [stocks, setStocks] = useState<AnalysisSection | null>(null)
  const [employees, setEmployees] = useState<AnalysisSection | null>(null)
  const [customers, setCustomers] = useState<AnalysisSection | null>(null)
  const [finance, setFinance] = useState<AnalysisSection | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Salam. BESTSOL ERP datalarına əsasən biznes vəziyyətini analiz etməyə hazıram. Yuxarıdakı sürətli suallardan birini seçə və ya öz sualınızı yaza bilərsiniz.",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [actionStates, setActionStates] = useState<Record<string, ActionDecision>>({})

  async function loadAll(activeToken: string) {
    const [
      overviewResponse,
      productsResponse,
      salesResponse,
      purchasesResponse,
      stocksResponse,
      employeesResponse,
      customersResponse,
      financeResponse,
    ] = await Promise.all([
      backendFetch("/ai-agent/overview", activeToken),
      backendFetch("/ai-agent/products", activeToken),
      backendFetch("/ai-agent/sales", activeToken),
      backendFetch("/ai-agent/purchases", activeToken),
      backendFetch("/ai-agent/stocks", activeToken),
      backendFetch("/ai-agent/employees", activeToken),
      backendFetch("/ai-agent/customers", activeToken),
      backendFetch("/ai-agent/finance", activeToken),
    ])

    setOverview(await overviewResponse.json())
    setProducts(await productsResponse.json())
    setSales(await salesResponse.json())
    setPurchases(await purchasesResponse.json())
    setStocks(await stocksResponse.json())
    setEmployees(await employeesResponse.json())
    setCustomers(await customersResponse.json())
    setFinance(await financeResponse.json())
  }

  async function bootstrap() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const activeToken = await ensureBackendToken("bestsol-ai-agent-web")
      setToken(activeToken)
      await loadAll(activeToken)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI Agent məlumatları yüklənmədi.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootstrap()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const refreshRecommendations = async () => {
    if (!token) return
    setIsRefreshing(true)

    try {
      const response = await backendFetch("/ai-agent/recommendations", token, { method: "POST" })
      const json = await response.json()
      setOverview((current) => current ? { ...current, recommendations: json.recommendations ?? current.recommendations } : current)
      toast({ title: "AI tövsiyələri yeniləndi" })
    } catch (error) {
      toast({
        title: "Tövsiyələr yenilənmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const sendChat = async (text?: string) => {
    const message = (text ?? chatInput).trim()
    if (!message || !token) return

    setIsSending(true)
    setChatInput("")
    setMessages((current) => [...current, { role: "user", content: message }])

    try {
      const response = await backendFetch("/ai-agent/chat", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      const json = await response.json()
      setMessages((current) => [...current, { role: "assistant", content: json.message ?? "Cavab alınmadı." }])
    } catch (error) {
      const description = error instanceof Error ? error.message : "Xəta baş verdi."
      setMessages((current) => [...current, { role: "assistant", content: `Cavab alınmadı: ${description}` }])
    } finally {
      setIsSending(false)
    }
  }

  const allRecommendations = useMemo(() => overview?.recommendations ?? [], [overview])

  const handleActionDecision = (item: Recommendation, decision: ActionDecision) => {
    const key = getRecommendationKey(item)
    setActionStates((current) => ({ ...current, [key]: decision }))

    const decisionText =
      decision === "apply"
        ? "Tətbiq üçün növbəyə alındı"
        : decision === "later"
          ? "Sonra baxılacaq kimi işarələndi"
          : "Rədd edildi kimi işarələndi"

    toast({
      title: item.title,
      description: decisionText,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="AI Agent" subtitle="Biznes analitikası və ağıllı tövsiyələr" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            AI Agent məlumatları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="AI Agent" subtitle="Biznes sağlamlığı, risklər və qərar tövsiyələri" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Card className="overflow-hidden border-border">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-sky-500/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600" />
                AI Agent Dashboard
              </CardTitle>
              <CardDescription>ERP datalarına əsasən ümumi biznes sağlamlığı və qərar prioritetləri</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="rounded-2xl border bg-muted/30 p-5 text-center">
                  <div className="text-sm text-muted-foreground">Biznes Sağlamlıq Skoru</div>
                  <div className="mt-2 text-5xl font-bold text-primary">{overview?.health_score ?? 0}</div>
                  <div className="mt-2 text-xs text-muted-foreground">100 üzərindən ümumi qiymətləndirmə</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(overview?.dashboard_cards ?? []).slice(0, 6).map((card) => (
                    <MetricCard key={card.title} title={card.title} value={card.value} module={card.module} />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <RecommendationPanel
                  title="Əsas Risklər"
                  icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
                  items={overview?.key_risks ?? []}
                />
                <RecommendationPanel
                  title="Əsas Fürsətlər"
                  icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                  items={overview?.key_opportunities ?? []}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Chat
              </CardTitle>
              <CardDescription>Real ERP datasına əsaslanan sual-cavab bölməsi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question) => (
                  <Button key={question} variant="outline" size="sm" onClick={() => void sendChat(question)}>
                    {question}
                  </Button>
                ))}
              </div>

              <ScrollArea className="h-80 rounded-xl border bg-muted/20 p-3">
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`rounded-xl px-4 py-3 text-sm ${message.role === "assistant" ? "bg-card border" : "bg-primary text-primary-foreground"}`}
                    >
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">
                        {message.role === "assistant" ? "AI Agent" : "Siz"}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Məsələn: Bu ay satışları artırmaq üçün plan ver"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void sendChat()
                    }
                  }}
                />
                <Button onClick={() => void sendChat()} disabled={isSending}>
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Action Suggestions
              </CardTitle>
              <CardDescription>AI tərəfindən prioritetləşdirilmiş tövsiyələr və gələcək avtomatlaşdırma üçün struktur</CardDescription>
            </div>
            <Button variant="outline" onClick={() => void refreshRecommendations()} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Tövsiyələri yenilə
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {(overview?.action_suggestions ?? []).slice(0, 8).map((item) => (
              <ActionCard
                key={getRecommendationKey(item)}
                item={item}
                decision={actionStates[getRecommendationKey(item)]}
                onDecision={handleActionDecision}
              />
            ))}
          </CardContent>
        </Card>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="products">Məhsullar</TabsTrigger>
            <TabsTrigger value="sales">Satış</TabsTrigger>
            <TabsTrigger value="purchases">Alış</TabsTrigger>
            <TabsTrigger value="stocks">Stok</TabsTrigger>
            <TabsTrigger value="employees">İşçilər</TabsTrigger>
            <TabsTrigger value="customers">Müştərilər</TabsTrigger>
            <TabsTrigger value="finance">Maliyyə</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <SectionLayout
              title="Məhsul Analizi"
              description="Top satış, ölü stok, endirim və qiymət optimizasiya siqnalları"
              data={products}
              cards={[
                { title: "Top satılanlar", items: readArray(products, "top_selling") },
                { title: "Ölü stok", items: readArray(products, "dead_stock") },
                { title: "Kritik stok", items: readArray(products, "critical_stock") },
                { title: "Endirim namizədləri", items: readArray(products, "discount_candidates") },
              ]}
            />
          </TabsContent>

          <TabsContent value="sales">
            <SectionLayout
              title="Satış Analizi"
              description="Performans dövrləri, gəlir və mənfəət liderləri, bundle siqnalları"
              data={sales}
              cards={[
                { title: "Gəlir liderləri", items: readArray(sales, "top_revenue_products") },
                { title: "Mənfəət liderləri", items: readArray(sales, "top_profit_products") },
                { title: "Zəif dövrlər", items: readArray(sales, "weak_periods") },
                { title: "Birlikdə satılanlar", items: readArray(sales, "frequently_bought_together") },
              ]}
            />
          </TabsContent>

          <TabsContent value="purchases">
            <SectionLayout
              title="Alış və Təchizatçı Analizi"
              description="Sərfəli təchizatçılar, artan alış qiymətləri və marja müqayisəsi"
              data={purchases}
              cards={[
                { title: "Təchizatçı müqayisəsi", items: readArray(purchases, "supplier_comparison") },
                { title: "Ən ucuz təchizatçılar", items: readArray(purchases, "cheapest_suppliers") },
                { title: "Qiyməti artan məhsullar", items: readArray(purchases, "rising_purchase_prices") },
                { title: "Marja müqayisəsi", items: readArray(purchases, "margin_comparison") },
              ]}
            />
          </TabsContent>

          <TabsContent value="stocks">
            <SectionLayout
              title="Stok və Anbar Analizi"
              description="Stok-out riski, artıq stok, reorder planı və anbar aktivliyi"
              data={stocks}
              cards={[
                { title: "Kritik stok", items: readArray(stocks, "critical_stock") },
                { title: "Artıq stok", items: readArray(stocks, "excess_stock") },
                { title: "Reorder planı", items: readArray(stocks, "reorder_plan") },
                { title: "Anbar aktivliyi", items: readArray(stocks, "warehouse_activity") },
              ]}
            />
          </TabsContent>

          <TabsContent value="employees">
            <SectionLayout
              title="İşçi Analizi"
              description="Ən aktiv və passiv istifadəçilər, modul istifadəsi və performans siqnalları"
              data={employees}
              cards={[
                { title: "Ən aktiv işçilər", items: readArray(employees, "most_active") },
                { title: "Passiv istifadəçilər", items: readArray(employees, "passive_users") },
                { title: "Satış liderləri", items: readArray(employees, "top_sales_people") },
                { title: "Modul istifadəsi", items: readArray(employees, "module_usage") },
              ]}
            />
          </TabsContent>

          <TabsContent value="customers">
            <SectionLayout
              title="Müştəri Analizi"
              description="VIP, borclu, passiv və kampaniya namizədi müştərilər"
              data={customers}
              cards={[
                { title: "Top müştərilər", items: readArray(customers, "top_customers") },
                { title: "Borclular", items: readArray(customers, "debtors") },
                { title: "Passiv müştərilər", items: readArray(customers, "inactive_customers") },
                { title: "Kampaniya namizədləri", items: readArray(customers, "campaign_candidates") },
              ]}
            />
          </TabsContent>

          <TabsContent value="finance">
            <SectionLayout
              title="Maliyyə Analizi"
              description="Gəlir, xərc, mənfəət, debt və risk siqnalları"
              data={finance}
              cards={[
                { title: "Zərərli məhsullar", items: readArray(finance, "loss_products") },
                { title: "Yüksək mənfəət", items: readArray(finance, "high_profit_products") },
                { title: "Hesablar", items: readArray(finance, "accounts") },
                { title: "Tövsiyələr", items: readArray(finance, "recommendations") },
              ]}
            />
          </TabsContent>
        </Tabs>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Bütün Tövsiyələr</CardTitle>
            <CardDescription>Bölmələr üzrə yığılmış bütün AI business analyst siqnalları</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {allRecommendations.map((item) => (
              <RecommendationCard key={`${item.title}-${item.module}`} item={item} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ title, value, module }: { title: string; value: string | number; module: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{module}</div>
      <div className="mt-2 text-xl font-semibold">{String(value)}</div>
      <div className="mt-1 text-sm text-muted-foreground">{title}</div>
    </div>
  )
}

function RecommendationPanel({ title, icon, items }: { title: string; icon: React.ReactNode; items: Recommendation[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-muted-foreground">Hazırda qeyd yoxdur.</div>}
        {items.slice(0, 4).map((item) => (
          <div key={item.title} className="rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{item.title}</div>
              <ImpactBadge impact={item.impact_level} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionLayout({
  title,
  description,
  data,
  cards,
}: {
  title: string
  description: string
  data: AnalysisSection | null
  cards: Array<{ title: string; items: unknown[] }>
}) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card) => (
            <div key={card.title} className="rounded-xl border bg-card">
              <div className="border-b px-4 py-3 font-medium">{card.title}</div>
              <div className="space-y-3 p-4">
                {card.items.length === 0 && <div className="text-sm text-muted-foreground">Kifayət qədər məlumat yoxdur.</div>}
                {card.items.slice(0, 5).map((item, index) => (
                  <div key={`${card.title}-${index}`} className="rounded-lg border bg-muted/20 px-3 py-2">
                    <div className="text-sm">{renderInsightItem(item)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {(data?.recommendations as Recommendation[] | undefined)?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {(data?.recommendations as Recommendation[]).map((item) => (
              <RecommendationCard key={`${item.title}-${item.module}`} item={item} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RecommendationCard({ item }: { item: Recommendation }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{item.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
        </div>
        <ImpactBadge impact={item.impact_level} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div><span className="font-medium">Səbəb:</span> {item.reason}</div>
        <div><span className="font-medium">Əməliyyat:</span> {item.recommended_action}</div>
        <div><span className="font-medium">Nəticə:</span> {item.expected_result}</div>
        <div><span className="font-medium">Modul:</span> {item.module}</div>
      </div>
    </div>
  )
}

function ActionCard({
  item,
  decision,
  onDecision,
}: {
  item: Recommendation
  decision?: ActionDecision
  onDecision: (item: Recommendation, decision: ActionDecision) => void
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{item.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
        </div>
        <ImpactBadge impact={item.impact_level} />
      </div>
      <div className="mt-3 text-sm">
        <div><span className="font-medium">Tövsiyə:</span> {item.recommended_action}</div>
      </div>
      {decision && (
        <div className="mt-3">
          <DecisionBadge decision={decision} />
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button size="sm" variant={decision === "apply" ? "default" : "outline"} onClick={() => onDecision(item, "apply")}>
          {item.actions?.apply ?? "Tətbiq et"}
        </Button>
        <Button size="sm" variant={decision === "later" ? "secondary" : "outline"} onClick={() => onDecision(item, "later")}>
          {item.actions?.later ?? "Sonra"}
        </Button>
        <Button size="sm" variant={decision === "reject" ? "destructive" : "ghost"} onClick={() => onDecision(item, "reject")}>
          {item.actions?.reject ?? "Rədd et"}
        </Button>
      </div>
    </div>
  )
}

function DecisionBadge({ decision }: { decision: ActionDecision }) {
  if (decision === "apply") {
    return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Tətbiq üçün seçildi</Badge>
  }

  if (decision === "later") {
    return <Badge variant="secondary">Sonra baxılacaq</Badge>
  }

  return <Badge variant="destructive">Rədd edildi</Badge>
}

function ImpactBadge({ impact }: { impact: Recommendation["impact_level"] }) {
  const variant =
    impact === "critical" ? "destructive" : impact === "high" ? "default" : "secondary"

  return <Badge variant={variant}>{impact}</Badge>
}

function renderInsightItem(item: unknown) {
  if (!item || typeof item !== "object") {
    return String(item ?? "-")
  }

  const row = item as Record<string, unknown>
  if (row.name) return `${row.name} - ${compactFields(row)}`
  if (row.product_name) return `${row.product_name} - ${compactFields(row)}`
  if (row.supplier_name) return `${row.supplier_name} - ${compactFields(row)}`
  if (row.weekday) return `${row.weekday} - ${compactFields(row)}`
  if (row.title) return `${row.title} - ${compactFields(row)}`
  if (Array.isArray(row.products)) {
    return `${(row.products as Array<{ name?: string }>).map((product) => product.name ?? "-").join(" + ")} - ${compactFields(row)}`
  }
  return compactFields(row)
}

function compactFields(row: Record<string, unknown>) {
  return Object.entries(row)
    .filter(([key]) => !["name", "product_name", "supplier_name", "title", "products"].includes(key))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === "number" ? Number(value).toFixed(2) : String(value)}`)
    .join(" • ")
}

function readArray(section: AnalysisSection | null, key: string) {
  const value = section?.[key]
  return Array.isArray(value) ? value : []
}

function getRecommendationKey(item: Recommendation) {
  return `${item.module}-${item.entity?.type ?? "generic"}-${item.entity?.id ?? "no-id"}-${item.title}`
}
