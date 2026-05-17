"use client"

import { FormEvent, useEffect, useState } from "react"
import { SendHorizonal, Sparkles } from "lucide-react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CrmPageHeader, CrmRecommendationCard } from "@/components/crm/crm-shared"
import { crmFetch, crmRequest, type CrmRecommendation } from "@/lib/crm"

type RecommendationsResponse = {
  recommendations: CrmRecommendation[]
  summary: string
}

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export function CrmAiPage() {
  const [recommendations, setRecommendations] = useState<CrmRecommendation[]>([])
  const [summary, setSummary] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Bu gün kimlərlə əlaqə saxlamalı olduğunuzu, riskli deal-ları və passiv müştəriləri real CRM datasına görə analiz edə bilərəm." },
  ])
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await crmFetch<RecommendationsResponse>("/ai/recommendations")
          setRecommendations(response.recommendations ?? [])
          setSummary(response.summary ?? "")
        } catch {
          setRecommendations([])
        }
      })()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!prompt.trim()) return

    const next = prompt.trim()
    setMessages((prev) => [...prev, { role: "user", content: next }])
    setPrompt("")
    setLoading(true)

    try {
      const response = await crmRequest<{ message: string; used_ai: boolean }>("/ai/chat", "POST", { message: next })
      setMessages((prev) => [...prev, { role: "assistant", content: response.message }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: err instanceof Error ? err.message : "AI cavabı alınmadı." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <CrmPageHeader title="AI CRM Assistant" description="Follow-up prioriteti, riskli deal-lar, passiv müştərilər və təklif mətni üçün CRM datasına əsaslanan AI köməkçi." />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Card className="border-border/70 bg-slate-950 text-white">
              <CardHeader>
                <CardDescription className="text-slate-300">AI CRM Summary</CardDescription>
                <CardTitle className="flex items-center gap-2 text-2xl"><Sparkles className="size-5" /> Prioritet baxış</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-200">{summary || "Tövsiyələr toplandıqca burada xülasə görünəcək."}</CardContent>
            </Card>

            <div className="grid gap-4">
              {recommendations.map((item, index) => <CrmRecommendationCard key={`${item.title}-${index}`} item={item} />)}
            </div>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>AI Chat</CardTitle>
              <CardDescription>Sual nümunələri: “Bu gün kimlərlə əlaqə saxlamalıyam?”, “Hansı deal-lar riskdədir?”, “Bu lead üçün təklif hazırla”.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[520px] space-y-3 overflow-y-auto rounded-2xl border bg-muted/20 p-4">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${message.role === "assistant" ? "bg-white border" : "ml-auto bg-primary text-primary-foreground"}`}>
                    {message.content}
                  </div>
                ))}
              </div>
              <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
                <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Sualınızı yazın..." className="min-h-28" />
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading || !prompt.trim()} className="gap-2">
                    <SendHorizonal className="size-4" />
                    {loading ? "Göndərilir..." : "Göndər"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
