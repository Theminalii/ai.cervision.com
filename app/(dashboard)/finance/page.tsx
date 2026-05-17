"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { backendFetch, ensureBackendToken } from "@/lib/backend-api"
import { toast } from "@/components/ui/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Wallet,
  Building2,
  CreditCard,
  Users,
  Truck,
  TrendingDown,
  TrendingUp,
  Plus,
  RefreshCcw,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type PaginatedResponse<T> = {
  data: T[]
}

type ResourceCollectionResponse<T> = {
  data?: T[]
}

type Account = {
  id: number
  name: string
  type: "cash" | "bank"
  balance: number
  status: "active" | "passive"
}

type Expense = {
  id: number
  title: string
  category_id: number | null
  category_name: string | null
  expense_type: "official" | "cash"
  payment_method: "cash" | "bank"
  amount: number
  note: string | null
  expense_date: string
}

type Transaction = {
  id: number
  account_id: number
  account_name: string | null
  type: "income" | "expense"
  source_type: string
  source_id: number | null
  amount: number
  description: string | null
  transaction_date: string
}

type Party = {
  id: number
  name: string
  phone: string
  email: string | null
  total_debt: number
  status: string
}

type Category = {
  id: number
  name: string
}

type FinanceSummary = {
  cash_balance: number
  bank_balance: number
  total_income: number
  total_expense: number
}

type AccountForm = {
  id: number | null
  name: string
  type: "cash" | "bank"
  balance: string
  status: "active" | "passive"
}

type ExpenseForm = {
  id: number | null
  title: string
  category_id: string
  expense_type: "cash" | "official"
  payment_method: "cash" | "bank"
  amount: string
  expense_date: string
  note: string
}

type DebtForm = {
  type: "customer" | "supplier"
  entityId: string
  amount: string
  payment_method: "cash" | "bank"
  transaction_date: string
  note: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
    minimumFractionDigits: 2,
  }).format(value)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

const currentDate = () => new Date().toISOString().slice(0, 10)

const defaultAccountForm = (): AccountForm => ({
  id: null,
  name: "",
  type: "cash",
  balance: "0",
  status: "active",
})

const defaultExpenseForm = (): ExpenseForm => ({
  id: null,
  title: "",
  category_id: "none",
  expense_type: "cash",
  payment_method: "cash",
  amount: "",
  expense_date: currentDate(),
  note: "",
})

const defaultDebtForm = (): DebtForm => ({
  type: "customer",
  entityId: "",
  amount: "",
  payment_method: "cash",
  transaction_date: currentDate(),
  note: "",
})

const unwrapCollection = <T,>(payload: T[] | ResourceCollectionResponse<T> | null | undefined): T[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

export default function FinancePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [customers, setCustomers] = useState<Party[]>([])
  const [suppliers, setSuppliers] = useState<Party[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [expenseSearch, setExpenseSearch] = useState("")
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("all")
  const [expensePaymentFilter, setExpensePaymentFilter] = useState("all")
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("all")
  const [transactionAccountFilter, setTransactionAccountFilter] = useState("all")
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all")
  const [transactionSourceFilter, setTransactionSourceFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("expenses")
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [isDebtDialogOpen, setIsDebtDialogOpen] = useState(false)
  const [accountForm, setAccountForm] = useState<AccountForm>(defaultAccountForm())
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(defaultExpenseForm())
  const [debtForm, setDebtForm] = useState<DebtForm>(defaultDebtForm())

  async function bootstrap() {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const token = await ensureBackendToken("bestsol-finance-web")
      const [
        summaryResponse,
        accountsResponse,
        expensesResponse,
        transactionsResponse,
        customersResponse,
        suppliersResponse,
        categoriesResponse,
      ] = await Promise.all([
        backendFetch("/finance/summary", token),
        backendFetch("/finance/accounts", token),
        backendFetch("/expenses?per_page=200", token),
        backendFetch("/finance/transactions?per_page=300", token),
        backendFetch("/customers?per_page=200", token),
        backendFetch("/suppliers?per_page=200", token),
        backendFetch("/categories", token),
      ])

      setSummary(await summaryResponse.json())
      setAccounts(await accountsResponse.json())
      setExpenses(((await expensesResponse.json()) as PaginatedResponse<Expense>).data ?? [])
      setTransactions(((await transactionsResponse.json()) as PaginatedResponse<Transaction>).data ?? [])
      setCustomers(((await customersResponse.json()) as PaginatedResponse<Party>).data ?? [])
      setSuppliers(((await suppliersResponse.json()) as PaginatedResponse<Party>).data ?? [])
      setCategories(unwrapCollection<Category>(await categoriesResponse.json()))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Maliyyə məlumatları yüklənmədi.")
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

  const customerDebtTotal = useMemo(
    () => customers.reduce((sum, customer) => sum + Number(customer.total_debt ?? 0), 0),
    [customers],
  )

  const supplierDebtTotal = useMemo(
    () => suppliers.reduce((sum, supplier) => sum + Number(supplier.total_debt ?? 0), 0),
    [suppliers],
  )

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        expenseSearch.trim().length === 0 ||
        expense.title.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (expense.note ?? "").toLowerCase().includes(expenseSearch.toLowerCase())
      const matchesType = expenseTypeFilter === "all" || expense.expense_type === expenseTypeFilter
      const matchesPayment =
        expensePaymentFilter === "all" || expense.payment_method === expensePaymentFilter
      const matchesCategory =
        expenseCategoryFilter === "all" || String(expense.category_id ?? "") === expenseCategoryFilter

      return matchesSearch && matchesType && matchesPayment && matchesCategory
    })
  }, [expenseCategoryFilter, expensePaymentFilter, expenseSearch, expenseTypeFilter, expenses])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesAccount =
        transactionAccountFilter === "all" || String(transaction.account_id) === transactionAccountFilter
      const matchesType =
        transactionTypeFilter === "all" || transaction.type === transactionTypeFilter
      const matchesSource =
        transactionSourceFilter === "all" || transaction.source_type === transactionSourceFilter

      return matchesAccount && matchesType && matchesSource
    })
  }, [transactionAccountFilter, transactionSourceFilter, transactionTypeFilter, transactions])

  const expenseSummary = useMemo(() => {
    return filteredExpenses.reduce(
      (carry, expense) => {
        carry.total += expense.amount
        if (expense.expense_type === "cash") {
          carry.cash += expense.amount
        } else {
          carry.official += expense.amount
        }
        return carry
      },
      { total: 0, cash: 0, official: 0 },
    )
  }, [filteredExpenses])

  const monthlyTransactionData = useMemo(() => {
    const monthMap = new Map<string, { month: string; income: number; expense: number }>()

    transactions.forEach((transaction) => {
      const monthKey = transaction.transaction_date.slice(0, 7)
      const existing = monthMap.get(monthKey) ?? { month: monthKey, income: 0, expense: 0 }
      if (transaction.type === "income") {
        existing.income += transaction.amount
      } else {
        existing.expense += transaction.amount
      }
      monthMap.set(monthKey, existing)
    })

    return [...monthMap.values()]
      .sort((left, right) => left.month.localeCompare(right.month))
      .slice(-6)
      .map((item) => ({
        ...item,
        label: new Date(`${item.month}-01`).toLocaleDateString("az-AZ", { month: "short" }),
      }))
  }, [transactions])

  const expenseDistribution = useMemo(() => {
    const categoryMap = new Map<string, number>()
    filteredExpenses.forEach((expense) => {
      const key = expense.category_name || "Kateqoriyasız"
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + expense.amount)
    })

    const colors = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]
    return [...categoryMap.entries()].map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
  }, [filteredExpenses])

  const customerDebts = useMemo(
    () => customers.filter((customer) => Number(customer.total_debt) > 0).sort((a, b) => b.total_debt - a.total_debt),
    [customers],
  )

  const supplierDebts = useMemo(
    () => suppliers.filter((supplier) => Number(supplier.total_debt) > 0).sort((a, b) => b.total_debt - a.total_debt),
    [suppliers],
  )

  const sourceOptions = useMemo(
    () => [...new Set(transactions.map((transaction) => transaction.source_type).filter(Boolean))],
    [transactions],
  )

  const openCreateAccount = () => {
    setAccountForm(defaultAccountForm())
    setIsAccountDialogOpen(true)
  }

  const openEditAccount = (account: Account) => {
    setAccountForm({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: String(account.balance),
      status: account.status,
    })
    setIsAccountDialogOpen(true)
  }

  const openCreateExpense = () => {
    setExpenseForm(defaultExpenseForm())
    setIsExpenseDialogOpen(true)
  }

  const openEditExpense = (expense: Expense) => {
    setExpenseForm({
      id: expense.id,
      title: expense.title,
      category_id: expense.category_id ? String(expense.category_id) : "none",
      expense_type: expense.expense_type,
      payment_method: expense.payment_method,
      amount: String(expense.amount),
      expense_date: expense.expense_date,
      note: expense.note ?? "",
    })
    setIsExpenseDialogOpen(true)
  }

  const openDebtDialog = (type: "customer" | "supplier", entityId?: number) => {
    setDebtForm({
      ...defaultDebtForm(),
      type,
      entityId: entityId ? String(entityId) : "",
      payment_method: type === "customer" ? "cash" : "bank",
    })
    setIsDebtDialogOpen(true)
  }

  const saveAccount = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-finance-account-save")
      await backendFetch(
        accountForm.id ? `/finance/accounts/${accountForm.id}` : "/finance/accounts",
        token,
        {
          method: accountForm.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: accountForm.name,
            type: accountForm.type,
            balance: Number(accountForm.balance || 0),
            status: accountForm.status,
          }),
        },
      )
      toast({ title: "Hesab saxlanıldı" })
      setIsAccountDialogOpen(false)
      await bootstrap()
    } catch (error) {
      toast({
        title: "Hesab saxlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAccount = async (account: Account) => {
    if (!window.confirm(`"${account.name}" hesabını silmək istəyirsiniz?`)) {
      return
    }

    try {
      const token = await ensureBackendToken("bestsol-finance-account-delete")
      await backendFetch(`/finance/accounts/${account.id}`, token, { method: "DELETE" })
      toast({ title: "Hesab silindi" })
      await bootstrap()
    } catch (error) {
      toast({
        title: "Hesab silinmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const saveExpense = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-finance-expense-save")
      await backendFetch(expenseForm.id ? `/expenses/${expenseForm.id}` : "/expenses", token, {
        method: expenseForm.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: expenseForm.title,
          category_id: expenseForm.category_id === "none" ? null : Number(expenseForm.category_id),
          expense_type: expenseForm.expense_type,
          payment_method: expenseForm.payment_method,
          amount: Number(expenseForm.amount || 0),
          expense_date: expenseForm.expense_date,
          note: expenseForm.note || null,
        }),
      })
      toast({ title: "Xərc saxlanıldı" })
      setIsExpenseDialogOpen(false)
      await bootstrap()
    } catch (error) {
      toast({
        title: "Xərc saxlanmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteExpense = async (expense: Expense) => {
    if (!window.confirm(`"${expense.title}" xərcini silmək istəyirsiniz?`)) {
      return
    }

    try {
      const token = await ensureBackendToken("bestsol-finance-expense-delete")
      await backendFetch(`/expenses/${expense.id}`, token, { method: "DELETE" })
      toast({ title: "Xərc silindi" })
      await bootstrap()
    } catch (error) {
      toast({
        title: "Xərc silinmədi",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    }
  }

  const submitDebtPayment = async () => {
    setIsSaving(true)
    try {
      const token = await ensureBackendToken("bestsol-finance-debt-payment")
      const path =
        debtForm.type === "customer"
          ? `/customers/${debtForm.entityId}/payment`
          : `/suppliers/${debtForm.entityId}/payment`

      await backendFetch(path, token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(debtForm.amount || 0),
          payment_method: debtForm.payment_method,
          transaction_date: debtForm.transaction_date,
          note: debtForm.note || null,
        }),
      })

      toast({ title: "Borc ödənişi qeydə alındı" })
      setIsDebtDialogOpen(false)
      await bootstrap()
    } catch (error) {
      toast({
        title: "Ödəniş alınmadı",
        description: error instanceof Error ? error.message : "Xəta baş verdi.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header title="Maliyyə" subtitle="Hesablar, xərclər və borclar" />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Maliyyə məlumatları yüklənir...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header title="Maliyyə" subtitle="Hesablar, xərclər və borclar" />

      <div className="flex-1 space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Bütün göstəricilər birbaşa backend əməliyyatlarından hesablanır.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void bootstrap()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Yenilə
            </Button>
            <Button variant="outline" onClick={openCreateAccount}>
              <Plus className="mr-2 h-4 w-4" />
              Hesab əlavə et
            </Button>
            <Button onClick={openCreateExpense}>
              <Plus className="mr-2 h-4 w-4" />
              Xərc əlavə et
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryCard icon={Wallet} title="Nağd kassa" value={summary?.cash_balance ?? 0} accent="text-chart-2" />
          <SummaryCard icon={Building2} title="Bank hesabı" value={summary?.bank_balance ?? 0} accent="text-chart-5" />
          <SummaryCard icon={TrendingUp} title="Cəmi gəlir" value={summary?.total_income ?? 0} accent="text-success" />
          <SummaryCard icon={TrendingDown} title="Cəmi xərc" value={summary?.total_expense ?? 0} accent="text-destructive" />
          <SummaryCard icon={Users} title="Müştəri borcları" value={customerDebtTotal} accent="text-primary" />
          <SummaryCard icon={Truck} title="Təchizatçı borcları" value={supplierDebtTotal} accent="text-amber-600" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Aylıq pul axını</CardTitle>
              <CardDescription>Son 6 ay üzrə gəlir və xərc müqayisəsi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTransactionData}>
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="income" name="Gəlir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Xərc" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Xərc bölgüsü</CardTitle>
              <CardDescription>Filtrə uyğun xərclərin kateqoriya paylanması</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row">
              <div className="h-[240px] w-full max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseDistribution} dataKey="value" nameKey="name" outerRadius={82}>
                      {expenseDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {expenseDistribution.length === 0 && (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                    Xərc məlumatı yoxdur.
                  </div>
                )}
                {expenseDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="expenses">Xərclər</TabsTrigger>
            <TabsTrigger value="accounts">Hesablar</TabsTrigger>
            <TabsTrigger value="transactions">Əməliyyatlar</TabsTrigger>
            <TabsTrigger value="debts">Borclar</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Xərc siyahısı</CardTitle>
                <CardDescription>Yarat, redaktə et və sil əməliyyatları aktivdir</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Input
                    placeholder="Axtarış..."
                    value={expenseSearch}
                    onChange={(event) => setExpenseSearch(event.target.value)}
                  />
                  <Select value={expenseTypeFilter} onValueChange={setExpenseTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Xərc növü" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün növlər</SelectItem>
                      <SelectItem value="cash">Nağd</SelectItem>
                      <SelectItem value="official">Rəsmi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={expensePaymentFilter} onValueChange={setExpensePaymentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ödəniş üsulu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün hesablar</SelectItem>
                      <SelectItem value="cash">Kassa</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={expenseCategoryFilter} onValueChange={setExpenseCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kateqoriya" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <InlineStat title="Cəmi xərc" value={formatCurrency(expenseSummary.total)} />
                  <InlineStat title="Nağd xərc" value={formatCurrency(expenseSummary.cash)} />
                  <InlineStat title="Rəsmi xərc" value={formatCurrency(expenseSummary.official)} />
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarix</TableHead>
                        <TableHead>Başlıq</TableHead>
                        <TableHead>Kateqoriya</TableHead>
                        <TableHead>Növ</TableHead>
                        <TableHead>Ödəniş</TableHead>
                        <TableHead className="text-right">Məbləğ</TableHead>
                        <TableHead className="w-[140px] text-right">Əməliyyat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{formatDate(expense.expense_date)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{expense.title}</div>
                            {expense.note && (
                              <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                                {expense.note}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{expense.category_name ?? "Kateqoriyasız"}</TableCell>
                          <TableCell>
                            <Badge variant={expense.expense_type === "cash" ? "secondary" : "default"}>
                              {expense.expense_type === "cash" ? "Nağd" : "Rəsmi"}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.payment_method === "cash" ? "Kassa" : "Bank"}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            -{formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditExpense(expense)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void deleteExpense(expense)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            Uyğun xərc tapılmadı.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Hesablar</CardTitle>
                <CardDescription>Kassa və bank hesablarını idarə edin</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead>Növ</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Balans</TableHead>
                        <TableHead className="w-[140px] text-right">Əməliyyat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>{account.type === "cash" ? "Nağd kassa" : "Bank hesabı"}</TableCell>
                          <TableCell>
                            <Badge variant={account.status === "active" ? "default" : "secondary"}>
                              {account.status === "active" ? "Aktiv" : "Passiv"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditAccount(account)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => void deleteAccount(account)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Maliyyə əməliyyatları</CardTitle>
                <CardDescription>Satış, alış, xərc və borc ödənişlərinin izi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Select value={transactionAccountFilter} onValueChange={setTransactionAccountFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Hesab seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün hesablar</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün tiplər</SelectItem>
                      <SelectItem value="income">Gəlir</SelectItem>
                      <SelectItem value="expense">Xərc</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={transactionSourceFilter} onValueChange={setTransactionSourceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mənbə" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Bütün mənbələr</SelectItem>
                      {sourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarix</TableHead>
                        <TableHead>Hesab</TableHead>
                        <TableHead>Mənbə</TableHead>
                        <TableHead>Açıqlama</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead className="text-right">Məbləğ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                          <TableCell>{transaction.account_name ?? "-"}</TableCell>
                          <TableCell>{transaction.source_type}</TableCell>
                          <TableCell>{transaction.description ?? "-"}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "income" ? "default" : "destructive"}>
                              {transaction.type === "income" ? "Gəlir" : "Xərc"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${transaction.type === "income" ? "text-success" : "text-destructive"}`}>
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Uyğun əməliyyat tapılmadı.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debts">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Müştəri borcları</CardTitle>
                      <CardDescription>Qismən və ya gecikmiş satış ödənişləri</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => openDebtDialog("customer")}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Ödəniş al
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Müştəri</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead className="text-right">Borc</TableHead>
                          <TableHead className="w-[120px] text-right">Əməliyyat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerDebts.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.phone}</TableCell>
                            <TableCell className="text-right">{formatCurrency(customer.total_debt)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => openDebtDialog("customer", customer.id)}>
                                Ödəniş
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {customerDebts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                              Açıq müştəri borcu yoxdur.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Təchizatçı borcları</CardTitle>
                      <CardDescription>Bağlanmamış satınalma öhdəlikləri</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => openDebtDialog("supplier")}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Ödəniş et
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Təchizatçı</TableHead>
                          <TableHead>Telefon</TableHead>
                          <TableHead className="text-right">Borc</TableHead>
                          <TableHead className="w-[120px] text-right">Əməliyyat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supplierDebts.map((supplier) => (
                          <TableRow key={supplier.id}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell>{supplier.phone}</TableCell>
                            <TableCell className="text-right">{formatCurrency(supplier.total_debt)}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => openDebtDialog("supplier", supplier.id)}>
                                Ödəniş
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {supplierDebts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                              Açıq təchizatçı borcu yoxdur.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{accountForm.id ? "Hesabı redaktə et" : "Yeni hesab"}</DialogTitle>
            <DialogDescription>Balans və hesab tipini sistemdə qeyd edin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Hesab adı</Label>
              <Input
                value={accountForm.name}
                onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Hesab növü</Label>
                <Select
                  value={accountForm.type}
                  onValueChange={(value: "cash" | "bank") =>
                    setAccountForm((current) => ({ ...current, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Nağd</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={accountForm.status}
                  onValueChange={(value: "active" | "passive") =>
                    setAccountForm((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="passive">Passiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Balans</Label>
              <Input
                type="number"
                step="0.01"
                value={accountForm.balance}
                onChange={(event) => setAccountForm((current) => ({ ...current, balance: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
              Ləğv et
            </Button>
            <Button onClick={() => void saveAccount()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{expenseForm.id ? "Xərci redaktə et" : "Yeni xərc"}</DialogTitle>
            <DialogDescription>Maliyyə çıxışını rəsmi və ya nağd olaraq qeyd edin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Başlıq</Label>
              <Input
                value={expenseForm.title}
                onChange={(event) => setExpenseForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Kateqoriya</Label>
                <Select
                  value={expenseForm.category_id}
                  onValueChange={(value) => setExpenseForm((current) => ({ ...current, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kateqoriyasız</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Xərc növü</Label>
                <Select
                  value={expenseForm.expense_type}
                  onValueChange={(value: "cash" | "official") =>
                    setExpenseForm((current) => ({ ...current, expense_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Nağd</SelectItem>
                    <SelectItem value="official">Rəsmi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ödəniş üsulu</Label>
                <Select
                  value={expenseForm.payment_method}
                  onValueChange={(value: "cash" | "bank") =>
                    setExpenseForm((current) => ({ ...current, payment_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Kassa</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Məbləğ</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tarix</Label>
              <Input
                type="date"
                value={expenseForm.expense_date}
                onChange={(event) =>
                  setExpenseForm((current) => ({ ...current, expense_date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Qeyd</Label>
              <Textarea
                value={expenseForm.note}
                onChange={(event) => setExpenseForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
              Ləğv et
            </Button>
            <Button onClick={() => void saveExpense()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saxla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDebtDialogOpen} onOpenChange={setIsDebtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{debtForm.type === "customer" ? "Müştəri ödənişi al" : "Təchizatçı ödənişi et"}</DialogTitle>
            <DialogDescription>Borc əməliyyatı hesab balanslarına da təsir edir.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{debtForm.type === "customer" ? "Müştəri" : "Təchizatçı"}</Label>
              <Select
                value={debtForm.entityId}
                onValueChange={(value) => setDebtForm((current) => ({ ...current, entityId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {(debtForm.type === "customer" ? customerDebts : supplierDebts).map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.name} - {formatCurrency(item.total_debt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Məbləğ</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={debtForm.amount}
                  onChange={(event) => setDebtForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ödəniş üsulu</Label>
                <Select
                  value={debtForm.payment_method}
                  onValueChange={(value: "cash" | "bank") =>
                    setDebtForm((current) => ({ ...current, payment_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Kassa</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tarix</Label>
              <Input
                type="date"
                value={debtForm.transaction_date}
                onChange={(event) =>
                  setDebtForm((current) => ({ ...current, transaction_date: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Qeyd</Label>
              <Textarea
                value={debtForm.note}
                onChange={(event) => setDebtForm((current) => ({ ...current, note: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDebtDialogOpen(false)}>
              Ləğv et
            </Button>
            <Button onClick={() => void submitDebtPayment()} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Təsdiqlə
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  accent,
}: {
  icon: LucideIcon
  title: string
  value: number
  accent: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold">{formatCurrency(value)}</p>
          </div>
          <div className="rounded-xl bg-muted p-3">
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InlineStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  )
}
