"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { backendFetch, clearLoggedOutFlag, loginToBackend, setStoredToken } from "@/lib/backend-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: "",
    password: "",
  })

  const resolveDestination = async (token: string) => {
    try {
      const response = await backendFetch("/me", token)
      const json = await response.json()
      const user = json.data ?? json
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768

      if (isMobile && user?.role?.name === "Satış Nümayəndəsi") {
        return "/pos"
      }
    } catch {
      // Fallback to dashboard when role lookup fails.
    }

    return "/dashboard"
  }

  const submit = async () => {
    if (!form.email.trim() || !form.password) {
      setErrorMessage("Email və şifrə daxil edin.")
      return
    }

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const token = await loginToBackend(form.email, form.password, "bestsol-login-web")
      if (!token) {
        throw new Error("Email və ya şifrə yanlışdır.")
      }

      setStoredToken(token)
      clearLoggedOutFlag()
      router.push(await resolveDestination(token))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Giriş alınmadı.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>BESTSOL Giriş</CardTitle>
          <CardDescription>Sistemə daxil olmaq üçün hesab məlumatlarınızı yazın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          <div className="space-y-2">
            <Label>E-poçt</Label>
            <Input
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Şifrə</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void submit()
                }
              }}
            />
          </div>
          <Button className="w-full" onClick={submit} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Daxil ol
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
