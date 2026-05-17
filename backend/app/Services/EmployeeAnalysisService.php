<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\WarehouseTransfer;

class EmployeeAnalysisService
{
    public function __construct(protected AnalyticsService $analytics)
    {
    }

    public function analyze(): array
    {
        $last30 = $this->analytics->rangeStart(30);

        $rows = User::with('role')->get()->map(function (User $user) use ($last30) {
            $salesCount = Sale::query()->where('user_id', $user->id)->whereDate('sale_date', '>=', $last30)->count();
            $salesTotal = (float) Sale::query()->where('user_id', $user->id)->whereDate('sale_date', '>=', $last30)->sum('total_amount');
            $stockOps = StockMovement::query()->where('created_by', $user->id)->whereDate('created_at', '>=', $last30)->count();
            $expenseOps = Expense::query()->where('created_by', $user->id)->whereDate('expense_date', '>=', $last30)->count();
            $transferOps = WarehouseTransfer::query()->where('created_by', $user->id)->whereDate('transfer_date', '>=', $last30)->count();
            $moduleUsage = [
                'sales' => $salesCount,
                'stocks' => $stockOps,
                'expenses' => $expenseOps,
                'warehouses' => $transferOps,
            ];
            $totalOps = array_sum($moduleUsage);

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'role' => $user->role?->name,
                'sales_count_30d' => $salesCount,
                'sales_total_30d' => round($salesTotal, 2),
                'stock_operations_30d' => $stockOps,
                'expense_operations_30d' => $expenseOps,
                'warehouse_operations_30d' => $transferOps,
                'total_operations_30d' => $totalOps,
                'module_usage' => $moduleUsage,
            ];
        })->values();

        $active = $rows->sortByDesc('total_operations_30d')->values();
        $topSales = $rows->sortByDesc('sales_total_30d')->values();
        $passive = $rows->filter(fn (array $row) => $row['total_operations_30d'] <= 0 || $row['status'] !== 'active')->sortBy('total_operations_30d')->values();

        $recommendations = [];
        if ($topSales->isNotEmpty()) {
            $user = $topSales->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$user['name']} ən güclü satış performansına malikdir",
                "Bu işçi son 30 gündə ən çox satış yaradan istifadəçilərdən biridir.",
                "Satış məbləği {$user['sales_total_30d']} AZN, əməliyyat sayı {$user['sales_count_30d']}-dir.",
                'medium',
                'Uğurlu satış yanaşmasını komanda daxilində paylaşın.',
                'Komanda performansı balanslı şəkildə artacaq.',
                'users',
                ['id' => $user['user_id'], 'type' => 'user']
            );
        }

        if ($passive->isNotEmpty()) {
            $user = $passive->first();
            $recommendations[] = $this->analytics->recommendation(
                "{$user['name']} passiv görünür",
                "İşçi son 30 gündə az və ya heç əməliyyat aparmayıb.",
                "Ümumi əməliyyat sayı {$user['total_operations_30d']} olub.",
                'high',
                'Tapşırıq bölgüsünü və giriş aktivliyini yoxlayın.',
                'Gizli istifadə problemi və performans itkisi üzə çıxacaq.',
                'users',
                ['id' => $user['user_id'], 'type' => 'user']
            );
        }

        return [
            'most_active' => $this->analytics->topCollection($active, 6),
            'least_active' => $this->analytics->topCollection($active->sortBy('total_operations_30d')->values(), 6),
            'top_sales_people' => $this->analytics->topCollection($topSales, 6),
            'passive_users' => $this->analytics->topCollection($passive, 6),
            'module_usage' => $this->analytics->topCollection($active, 8),
            'recommendations' => $recommendations,
        ];
    }
}
