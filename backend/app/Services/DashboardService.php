<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Stock;
use Illuminate\Support\Facades\Cache;

class DashboardService
{
    public function summary(): array
    {
        return Cache::remember('dashboard:summary', now()->addSeconds(20), fn () => [
            'today_sales' => (float) Sale::whereDate('sale_date', today())->sum('total_amount'),
            'monthly_sales' => (float) Sale::whereYear('sale_date', now()->year)->whereMonth('sale_date', now()->month)->sum('total_amount'),
            'customer_debt' => (float) \App\Models\Customer::sum('total_debt'),
            'supplier_debt' => (float) \App\Models\Supplier::sum('total_debt'),
            'real_stock_value' => (float) Stock::query()->join('products', 'products.id', '=', 'stocks.product_id')->selectRaw('SUM(stocks.real_quantity * products.cost_price) as total')->value('total'),
            'official_stock_value' => (float) Stock::query()->join('products', 'products.id', '=', 'stocks.product_id')->selectRaw('SUM(stocks.official_quantity * products.cost_price) as total')->value('total'),
        ]);
    }

    public function salesChart(): array
    {
        return Cache::remember('dashboard:sales-chart', now()->addSeconds(30), fn () => Sale::query()
            ->whereDate('sale_date', '>=', now()->subMonths(11)->startOfMonth()->toDateString())
            ->orderBy('sale_date')
            ->get(['sale_date', 'total_amount'])
            ->groupBy(fn (Sale $sale) => $sale->sale_date->format('Y-m'))
            ->map(fn ($items, string $month) => [
                'month' => $month,
                'total' => round((float) $items->sum('total_amount'), 2),
            ])
            ->values()
            ->all());
    }

    public function expenseChart(): array
    {
        return Cache::remember('dashboard:expense-chart', now()->addSeconds(30), fn () => Expense::query()
            ->whereDate('expense_date', '>=', now()->subMonths(11)->startOfMonth()->toDateString())
            ->orderBy('expense_date')
            ->get(['expense_date', 'amount'])
            ->groupBy(fn (Expense $expense) => $expense->expense_date->format('Y-m'))
            ->map(fn ($items, string $month) => [
                'month' => $month,
                'total' => round((float) $items->sum('amount'), 2),
            ])
            ->values()
            ->all());
    }

    public function recentSales()
    {
        return Cache::remember('dashboard:recent-sales', now()->addSeconds(15), fn () => Sale::with(['customer', 'user'])->latest('sale_date')->limit(10)->get());
    }

    public function recentPurchases()
    {
        return Cache::remember('dashboard:recent-purchases', now()->addSeconds(20), fn () => Purchase::with('supplier')->latest('purchase_date')->limit(10)->get());
    }

    public function lowStock()
    {
        return Cache::remember('dashboard:low-stock', now()->addSeconds(20), fn () => Stock::with('product')
            ->whereColumn('real_quantity', '<=', 'minimum_quantity')
            ->orderBy('real_quantity')
            ->get());
    }
}
