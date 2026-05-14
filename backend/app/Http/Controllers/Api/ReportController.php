<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Http\Resources\PurchaseResource;
use App\Http\Resources\SaleResource;
use App\Http\Resources\StockResource;
use App\Models\Customer;
use App\Models\Product;
use App\Services\ReportService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(protected ReportService $reportService)
    {
    }

    protected function ensureJsonExport(Request $request)
    {
        if ($request->filled('export') && $request->export !== 'json') {
            return response()->json([
                'message' => 'Excel/PDF export endpoint strukturu hazırdır, amma hazırda yalnız json aktivdir.',
            ], 422);
        }

        return null;
    }

    public function sales(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        return SaleResource::collection($this->reportService->sales($request));
    }

    public function stock(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        return StockResource::collection($this->reportService->stock($request));
    }

    public function finance(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        $sales = $this->reportService->sales($request);
        $purchases = $this->reportService->purchases($request);
        $expenses = $this->reportService->expenses($request);

        return response()->json([
            'sales_total' => (float) $sales->getCollection()->sum('total_amount'),
            'purchase_total' => (float) $purchases->getCollection()->sum('total_amount'),
            'expense_total' => (float) $expenses->getCollection()->sum('amount'),
        ]);
    }

    public function customerDebts(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        return response()->json(
            Customer::query()
                ->when($request->customer_id, fn ($query) => $query->whereKey($request->customer_id))
                ->where('total_debt', '>', 0)
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function purchases(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        return PurchaseResource::collection($this->reportService->purchases($request));
    }

    public function expenses(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        return ExpenseResource::collection($this->reportService->expenses($request));
    }

    public function costPrices(Request $request)
    {
        if ($response = $this->ensureJsonExport($request)) {
            return $response;
        }

        return response()->json(
            Product::query()
                ->when($request->category_id, fn ($query) => $query->where('category_id', $request->category_id))
                ->when($request->brand_id, fn ($query) => $query->where('brand_id', $request->brand_id))
                ->paginate($request->integer('per_page', 15))
        );
    }
}
