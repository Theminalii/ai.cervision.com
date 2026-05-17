"use client"

import Link from "next/link"
import { ReactNode } from "react"
import { ArrowRight, AlertTriangle, CheckCircle2, Clock3, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import type { CrmMeta, CrmRecommendation } from "@/lib/crm"

export function CrmPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
          CRM Workspace
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CrmToolbar({
  search,
  onSearchChange,
  filters,
  actions,
}: {
  search: string
  onSearchChange: (value: string) => void
  filters?: ReactNode
  actions?: ReactNode
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Axtar..."
            className="md:max-w-sm"
          />
          {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}

export function CrmStatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string
  value: string
  hint: string
  icon?: ReactNode
}) {
  return (
    <Card className="border-border/70 bg-white/90">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 text-2xl">{value}</CardTitle>
        </div>
        <div className="rounded-2xl bg-primary/8 p-2 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

export function CrmEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Empty className="border border-dashed border-border/70 bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Sparkles className="size-5" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

export function CrmPagination({ meta, onPageChange }: { meta?: CrmMeta; onPageChange: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) {
    return null
  }

  const pages = Array.from({ length: meta.last_page }, (_, index) => index + 1).slice(
    Math.max(0, meta.current_page - 3),
    Math.min(meta.last_page, meta.current_page + 2),
  )

  return (
    <Pagination className="justify-end">
      <PaginationContent>
        {pages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              isActive={page === meta.current_page}
              onClick={(event) => {
                event.preventDefault()
                onPageChange(page)
              }}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  )
}

export function CrmStatusBadge({ value }: { value?: string | null }) {
  const tone =
    value === "vip" || value === "won" || value === "active" || value === "completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : value === "blocked" || value === "lost" || value === "overdue"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : value === "qualified" || value === "proposal" || value === "contacted" || value === "in_progress"
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-700 border-slate-200"

  return <Badge variant="outline" className={cn("capitalize", tone)}>{String(value ?? "unknown").replaceAll("_", " ")}</Badge>
}

export function CrmPriorityBadge({ value }: { value?: string | null }) {
  const tone =
    value === "urgent"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : value === "high"
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : value === "medium"
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-slate-50 text-slate-700 border-slate-200"

  return <Badge variant="outline" className={cn("capitalize", tone)}>{value ?? "low"}</Badge>
}

export function CrmRecommendationCard({ item }: { item: CrmRecommendation }) {
  const icon =
    item.impact_level === "critical" ? <AlertTriangle className="size-4" /> :
      item.impact_level === "high" ? <Clock3 className="size-4" /> :
        <CheckCircle2 className="size-4" />

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription className="mt-1">{item.description}</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 capitalize">
            {icon}
            {item.impact_level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-medium text-foreground">Səbəb</p>
          <p className="text-muted-foreground">{item.reason}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Tövsiyə</p>
          <p className="text-muted-foreground">{item.recommended_action}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{item.expected_result}</p>
          {item.entity?.type && item.entity?.id ? (
            <Button asChild size="sm" variant="ghost" className="gap-1">
              <Link href={crmEntityHref(item.entity.type, item.entity.id)}>
                Bax
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function crmEntityHref(type: string, id: number) {
  if (type === "customer") {
    return `/crm/customers/${id}`
  }
  if (type === "lead") {
    return `/crm/leads`
  }
  if (type === "deal") {
    return `/crm/deals`
  }
  if (type === "task") {
    return `/crm/tasks`
  }
  return "/crm"
}
