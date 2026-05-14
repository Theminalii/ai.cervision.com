<?php

namespace App\Services;

use App\Models\CashAccount;
use App\Models\FinancialTransaction;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class FinanceService
{
    public function getAccountByType(string $type): CashAccount
    {
        return CashAccount::query()
            ->where('type', $type)
            ->where('status', 'active')
            ->firstOr(fn () => throw new RuntimeException("{$type} hesabı tapılmadı."));
    }

    public function increaseBalance(CashAccount $account, float $amount, string $sourceType, ?int $sourceId, string $description, string $transactionDate): FinancialTransaction
    {
        $account->increment('balance', $amount);

        return FinancialTransaction::create([
            'account_id' => $account->id,
            'type' => 'income',
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'amount' => $amount,
            'description' => $description,
            'transaction_date' => $transactionDate,
        ]);
    }

    public function decreaseBalance(CashAccount $account, float $amount, string $sourceType, ?int $sourceId, string $description, string $transactionDate): FinancialTransaction
    {
        if ((float) $account->balance < $amount) {
            throw new RuntimeException("{$account->name} hesabında kifayət qədər məbləğ yoxdur.");
        }

        $account->decrement('balance', $amount);

        return FinancialTransaction::create([
            'account_id' => $account->id,
            'type' => 'expense',
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'amount' => $amount,
            'description' => $description,
            'transaction_date' => $transactionDate,
        ]);
    }

    public function resolveAccountTypeForSale(string $saleType): string
    {
        return $saleType === 'official' ? 'bank' : 'cash';
    }

    public function resolveAccountTypeForExpense(string $paymentMethod): string
    {
        return $paymentMethod === 'bank' ? 'bank' : 'cash';
    }
}
