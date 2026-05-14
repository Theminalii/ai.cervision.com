<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PurchaseResource;
use App\Http\Resources\SaleResource;
use App\Http\Resources\StockResource;
use App\Services\DashboardService;

class DashboardController extends Controller
{
    public function __construct(protected DashboardService $dashboardService)
    {
    }

    public function summary()
    {
        return response()->json($this->dashboardService->summary());
    }

    public function salesChart()
    {
        return response()->json($this->dashboardService->salesChart());
    }

    public function expenseChart()
    {
        return response()->json($this->dashboardService->expenseChart());
    }

    public function recentSales()
    {
        return SaleResource::collection($this->dashboardService->recentSales());
    }

    public function recentPurchases()
    {
        return PurchaseResource::collection($this->dashboardService->recentPurchases());
    }

    public function lowStock()
    {
        return StockResource::collection($this->dashboardService->lowStock());
    }
}
