<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ExpenseService
{
    public function __construct(protected FinanceService $financeService)
    {
    }

    public function create(array $data, ?User $user = null): Expense
    {
        return DB::transaction(function () use ($data, $user): Expense {
            $expense = Expense::create($data + ['created_by' => $user?->id]);

            $account = $this->financeService->getAccountByType(
                $this->financeService->resolveAccountTypeForExpense($expense->payment_method)
            );

            $this->financeService->decreaseBalance(
                $account,
                (float) $expense->amount,
                'expense',
                $expense->id,
                $expense->title,
                $expense->expense_date->toDateString()
            );

            return $expense->load('category');
        });
    }
}
