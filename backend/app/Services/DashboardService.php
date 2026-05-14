<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Stock;

class DashboardService
{
    public function summary(): array
    {
        return [
            'today_sales' => (float) Sale::whereDate('sale_date', today())->sum('total_amount'),
            'monthly_sales' => (float) Sale::whereMonth('sale_date', now()->month)->sum('total_amount'),
            'customer_debt' => (float) \App\Models\Customer::sum('total_debt'),
            'supplier_debt' => (float) \App\Models\Supplier::sum('total_debt'),
            'real_stock_value' => (float) Stock::query()->join('products', 'products.id', '=', 'stocks.product_id')->selectRaw('SUM(stocks.real_quantity * products.cost_price) as total')->value('total'),
            'official_stock_value' => (float) Stock::query()->join('products', 'products.id', '=', 'stocks.product_id')->selectRaw('SUM(stocks.official_quantity * products.cost_price) as total')->value('total'),
        ];
    }

    public function salesChart(): array
    {
        return Sale::query()
            ->selectRaw("strftime('%Y-%m', sale_date) as month, SUM(total_amount) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->toArray();
    }

    public function expenseChart(): array
    {
        return Expense::query()
            ->selectRaw("strftime('%Y-%m', expense_date) as month, SUM(amount) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->toArray();
    }

    public function recentSales()
    {
        return Sale::with(['customer', 'user'])->latest('sale_date')->limit(10)->get();
    }

    public function recentPurchases()
    {
        return Purchase::with('supplier')->latest('purchase_date')->limit(10)->get();
    }

    public function lowStock()
    {
        return Stock::with('product')
            ->whereColumn('real_quantity', '<=', 'minimum_quantity')
            ->orderBy('real_quantity')
            ->get();
    }
}
