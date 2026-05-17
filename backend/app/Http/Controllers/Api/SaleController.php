<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\DebtPaymentRequest;
use App\Http\Requests\Operations\StoreSaleRequest;
use App\Http\Resources\SaleResource;
use App\Models\DebtTransaction;
use App\Models\FinancialTransaction;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Services\SaleService;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function __construct(protected SaleService $saleService)
    {
    }

    public function index(Request $request)
    {
        $query = Sale::with(['customer', 'user', 'items.product'])
            ->when($request->customer_id, fn ($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->payment_status, fn ($q) => $q->where('payment_status', $request->payment_status));

        if ($request->user()->role?->name === 'Satış Nümayəndəsi') {
            $query->where('user_id', $request->user()->id);
        }

        return SaleResource::collection(
            $query->orderByDesc('sale_date')->paginate($request->integer('per_page', 15))
        );
    }

    public function store(StoreSaleRequest $request)
    {
        return new SaleResource($this->saleService->create($request->validated(), $request->user()));
    }

    public function show(Request $request, Sale $sale)
    {
        if ($request->user()->role?->name === 'Satış Nümayəndəsi' && $sale->user_id !== $request->user()->id) {
            abort(403, 'Yalnız öz satışlarınızı görə bilərsiniz.');
        }

        return new SaleResource($sale->load(['customer', 'user', 'items.product']));
    }

    public function destroy(Sale $sale)
    {
        $hasSideEffects = StockMovement::query()
            ->where('reference_type', Sale::class)
            ->where('reference_id', $sale->id)
            ->exists()
            || FinancialTransaction::query()
                ->whereIn('source_type', ['sale', 'sale_payment'])
                ->where('source_id', $sale->id)
                ->exists()
            || DebtTransaction::query()
                ->where('reference_type', Sale::class)
                ->where('reference_id', $sale->id)
                ->exists();

        if ($hasSideEffects) {
            return response()->json([
                'message' => 'Stok, maliyyə və ya borc qeydləri yaranmış satış silinə bilməz.',
            ], 422);
        }

        $sale->delete();

        return response()->json(['message' => 'Satış silindi.']);
    }

    public function invoice(Sale $sale)
    {
        return new SaleResource($sale->load(['customer', 'user', 'items.product']));
    }

    public function payment(DebtPaymentRequest $request, Sale $sale)
    {
        if ($request->user()->role?->name === 'Satış Nümayəndəsi' && $sale->user_id !== $request->user()->id) {
            abort(403, 'Yalnız öz satışlarınız üzrə ödəniş qəbul edə bilərsiniz.');
        }

        return new SaleResource($this->saleService->applyPayment($sale, $request->validated()));
    }
}
