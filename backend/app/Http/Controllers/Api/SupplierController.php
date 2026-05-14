<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\DebtPaymentRequest;
use App\Http\Requests\Party\UpsertSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use App\Services\DebtService;
use App\Services\FinanceService;
use App\Services\SettingsNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplierController extends Controller
{
    public function __construct(
        protected DebtService $debtService,
        protected FinanceService $financeService,
        protected SettingsNotificationService $notificationService,
    ) {
    }

    public function index(Request $request)
    {
        $suppliers = Supplier::query()
            ->when($request->search, fn ($query) => $query
                ->where('name', 'like', '%'.$request->search.'%')
                ->orWhere('phone', 'like', '%'.$request->search.'%'))
            ->orderBy($request->get('sort', 'id'), $request->get('direction', 'desc'))
            ->paginate($request->integer('per_page', 15));

        return SupplierResource::collection($suppliers);
    }

    public function store(UpsertSupplierRequest $request)
    {
        return new SupplierResource(Supplier::create($request->validated()));
    }

    public function show(Supplier $supplier)
    {
        return new SupplierResource($supplier);
    }

    public function update(UpsertSupplierRequest $request, Supplier $supplier)
    {
        $supplier->update($request->validated());

        return new SupplierResource($supplier);
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->purchases()->exists()) {
            return response()->json([
                'message' => 'Satınalma tarixçəsi olan təchizatçı silinə bilməz.',
            ], 422);
        }

        if ($supplier->debtTransactions()->exists()) {
            return response()->json([
                'message' => 'Borc əməliyyatı olan təchizatçı silinə bilməz.',
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'message' => 'Təchizatçı silindi.',
        ]);
    }

    public function debts(Supplier $supplier)
    {
        return response()->json([
            'supplier' => new SupplierResource($supplier),
            'transactions' => $supplier->debtTransactions()->latest('transaction_date')->get(),
        ]);
    }

    public function payment(DebtPaymentRequest $request, Supplier $supplier)
    {
        DB::transaction(function () use ($request, $supplier): void {
            $this->debtService->payDebt($supplier, (float) $request->amount, null, $request->note, $request->transaction_date);
            $account = $this->financeService->getAccountByType($request->payment_method);
            $this->financeService->decreaseBalance($account, (float) $request->amount, 'supplier_debt_payment', $supplier->id, $supplier->name.' borc ödənişi', $request->transaction_date);
            $this->notificationService->notifyPayment('Təchizatçı ödənişi', "{$supplier->name} üçün {$request->amount} AZN ödəniş edildi.");
        });

        return new SupplierResource($supplier->refresh());
    }
}
