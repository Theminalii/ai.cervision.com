<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(protected ExpenseService $expenseService)
    {
    }

    public function index(Request $request)
    {
        return ExpenseResource::collection(
            Expense::with('category')
                ->when($request->expense_type, fn ($query) => $query->where('expense_type', $request->expense_type))
                ->when($request->payment_method, fn ($query) => $query->where('payment_method', $request->payment_method))
                ->when($request->category_id, fn ($query) => $query->where('category_id', $request->category_id))
                ->when($request->search, fn ($query) => $query
                    ->where('title', 'like', '%'.$request->search.'%')
                    ->orWhere('note', 'like', '%'.$request->search.'%'))
                ->when($request->date_from, fn ($query) => $query->whereDate('expense_date', '>=', $request->date_from))
                ->when($request->date_to, fn ($query) => $query->whereDate('expense_date', '<=', $request->date_to))
                ->latest('expense_date')
                ->paginate($request->integer('per_page', 15))
        );
    }

    public function store(StoreExpenseRequest $request)
    {
        return new ExpenseResource($this->expenseService->create($request->validated(), $request->user()));
    }

    public function show(Expense $expense)
    {
        return new ExpenseResource($expense->load('category'));
    }

    public function update(StoreExpenseRequest $request, Expense $expense)
    {
        $expense->update($request->validated());

        return new ExpenseResource($expense->load('category'));
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return response()->json(['message' => 'Xərc silindi.']);
    }
}
