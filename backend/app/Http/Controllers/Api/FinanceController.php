<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\UpsertCashAccountRequest;
use App\Models\CashAccount;
use App\Http\Resources\FinancialTransactionResource;
use App\Models\FinancialTransaction;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function summary()
    {
        return response()->json([
            'cash_balance' => (float) CashAccount::where('type', 'cash')->sum('balance'),
            'bank_balance' => (float) CashAccount::where('type', 'bank')->sum('balance'),
            'total_income' => (float) FinancialTransaction::where('type', 'income')->sum('amount'),
            'total_expense' => (float) FinancialTransaction::where('type', 'expense')->sum('amount'),
        ]);
    }

    public function accounts()
    {
        return response()->json(
            CashAccount::query()
                ->orderBy('type')
                ->orderBy('name')
                ->get()
        );
    }

    public function storeAccount(UpsertCashAccountRequest $request)
    {
        return response()->json(CashAccount::create($request->validated()), 201);
    }

    public function updateAccount(UpsertCashAccountRequest $request, CashAccount $account)
    {
        $account->update($request->validated());

        return response()->json($account->fresh());
    }

    public function destroyAccount(CashAccount $account)
    {
        if ($account->transactions()->exists()) {
            return response()->json([
                'message' => 'Əməliyyat bağlı hesab silinə bilməz.',
            ], 422);
        }

        $account->delete();

        return response()->json([
            'message' => 'Hesab silindi.',
        ]);
    }

    public function transactions(Request $request)
    {
        return FinancialTransactionResource::collection(
            FinancialTransaction::with('account')
                ->when($request->account_id, fn ($query) => $query->where('account_id', $request->account_id))
                ->when($request->type, fn ($query) => $query->where('type', $request->type))
                ->when($request->source_type, fn ($query) => $query->where('source_type', $request->source_type))
                ->when($request->date_from, fn ($query) => $query->whereDate('transaction_date', '>=', $request->date_from))
                ->when($request->date_to, fn ($query) => $query->whereDate('transaction_date', '<=', $request->date_to))
                ->latest('transaction_date')
                ->paginate($request->integer('per_page', 20))
        );
    }
}
