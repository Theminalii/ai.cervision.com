<?php

namespace App\Services;

use App\Models\CashAccount;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\FinancialTransaction;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Supplier;

class FinanceAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $monthStart = $this->analytics->monthStart();
        $last30 = $this->analytics->rangeStart(30);

        $salesMonth = Sale::query()->whereDate('sale_date', '>=', $monthStart)->get();
        $expensesMonth = Expense::query()->whereDate('expense_date', '>=', $monthStart)->get();
        $incomeTransactions = FinancialTransaction::query()->where('type', 'income')->whereDate('transaction_date', '>=', $monthStart)->sum('amount');
        $expenseTransactions = FinancialTransaction::query()->where('type', 'expense')->whereDate('transaction_date', '>=', $monthStart)->sum('amount');

        $grossRevenue = (float) $salesMonth->sum('total_amount');
        $cashSales = (float) $salesMonth->where('sale_type', 'cash')->sum('total_amount');
        $officialSales = (float) $salesMonth->where('sale_type', 'official')->sum('total_amount');
        $operatingExpense = (float) $expensesMonth->sum('amount');
        $estimatedCogs = (float) SaleItem::with('product')
            ->whereHas('sale', fn ($query) => $query->whereDate('sale_date', '>=', $monthStart))
            ->get()
            ->sum(fn (SaleItem $item) => (float) $item->quantity * (float) ($item->product?->cost_price ?? 0));
        $estimatedProfit = round($grossRevenue - $estimatedCogs - $operatingExpense, 2);

        $lossProducts = Product::all()->map(function (Product $product) use ($last30) {
            $sales = $product->saleItems()->whereHas('sale', fn ($query) => $query->whereDate('sale_date', '>=', $last30))->get();
            $qty = (float) $sales->sum('quantity');
            $revenue = (float) $sales->sum('total_price');
            $profit = round($revenue - ($qty * (float) $product->cost_price), 2);

            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'revenue_30d' => round($revenue, 2),
                'profit_30d' => $profit,
            ];
        })->filter(fn (array $row) => $row['revenue_30d'] > 0)->sortBy('profit_30d')->values();

        $highProfitProducts = $lossProducts->sortByDesc('profit_30d')->values();
        $accounts = CashAccount::all()->map(fn (CashAccount $account) => [
            'account_id' => $account->id,
            'name' => $account->name,
            'type' => $account->type,
            'balance' => (float) $account->balance,
            'status' => $account->status,
        ])->values();

        $customerDebt = (float) Customer::sum('total_debt');
        $supplierDebt = (float) Supplier::sum('total_debt');

        $recommendations = [];
        $cashBalance = (float) CashAccount::where('type', 'cash')->sum('balance');
        if ($cashBalance < max(500, ($operatingExpense / 30) * 7)) {
            $recommendations[] = $this->analytics->recommendation(
                'Nağd balans riski görünür',
                'Kassadakı vəsait qısamüddətli xərclərə görə təzyiq altındadır.',
                "Nağd balans {$cashBalance} AZN, aylıq xərc isə {$operatingExpense} AZN-dir.",
                'critical',
                'Nağd axını planını yeniləyin və debitor yığımını sürətləndirin.',
                'Likvidlik riski azalacaq.',
                'finance'
            );
        }

        if ($lossProducts->isNotEmpty()) {
            $product = $lossProducts->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$product['product_name']} üzrə marja zəifdir",
                'Bu məhsul satış yaratsa da mənfəət töhfəsi zəif və ya mənfidir.',
                "Son 30 gündə təxmini mənfəət {$product['profit_30d']} AZN-dir.",
                'high',
                'Qiymət, alış mənbəyi və kampaniya strategiyasını yenidən nəzərdən keçirin.',
                'Zərərli satışların payı azalacaq.',
                'finance',
                ['id' => $product['product_id'], 'type' => 'product']
            );
        }

        return [
            'total_revenue' => round($grossRevenue, 2),
            'total_expense' => round($operatingExpense, 2),
            'estimated_profit' => $estimatedProfit,
            'income_transactions' => round((float) $incomeTransactions, 2),
            'expense_transactions' => round((float) $expenseTransactions, 2),
            'loss_products' => $this->analytics->topCollection($lossProducts, 6),
            'high_profit_products' => $this->analytics->topCollection($highProfitProducts, 6),
            'cash_vs_official_sales' => [
                'cash_sales' => round($cashSales, 2),
                'official_sales' => round($officialSales, 2),
            ],
            'customer_debt_total' => round($customerDebt, 2),
            'supplier_debt_total' => round($supplierDebt, 2),
            'accounts' => $accounts->all(),
            'recommendations' => $recommendations,
        ];
    }
}
