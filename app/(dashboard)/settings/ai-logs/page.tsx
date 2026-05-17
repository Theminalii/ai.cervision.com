"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { omniFetch } from "@/lib/omnichannel"

export default function AiLogsPage() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void omniFetch<any>("/settings/ai/logs").then((json) => setLogs(json.data?.data ?? json.data ?? [])).catch(() => setLogs([]))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <>
      <Header />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Logları</h1>
          <p className="mt-2 text-sm text-muted-foreground">Provider istifadə statistikası, token sərfiyyatı və modul üzrə AI çağırışları.</p>
        </div>
        <Card>
          <CardHeader><CardTitle>Usage Logs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarix</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Modul</TableHead>
                  <TableHead>Total Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.created_at}</TableCell>
                    <TableCell>{log.provider}</TableCell>
                    <TableCell>{log.model}</TableCell>
                    <TableCell>{log.module}</TableCell>
                    <TableCell>{log.total_tokens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
