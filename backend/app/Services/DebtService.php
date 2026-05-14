<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\DebtTransaction;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class DebtService
{
    public function createDebt(Customer|Supplier $party, float $amount, ?Model $reference, ?string $note, string $transactionDate): DebtTransaction
    {
        $party->increment('total_debt', $amount);

        return $party->debtTransactions()->create([
            'type' => 'debt',
            'amount' => $amount,
            'reference_type' => $reference ? $reference::class : null,
            'reference_id' => $reference?->getKey(),
            'note' => $note,
            'transaction_date' => $transactionDate,
        ]);
    }

    public function payDebt(Customer|Supplier $party, float $amount, ?Model $reference, ?string $note, string $transactionDate): DebtTransaction
    {
        if ((float) $party->total_debt < $amount) {
            throw new RuntimeException('Ödənilən məbləğ mövcud borcdan çox ola bilməz.');
        }

        $party->decrement('total_debt', $amount);

        return $party->debtTransactions()->create([
            'type' => 'payment',
            'amount' => $amount,
            'reference_type' => $reference ? $reference::class : null,
            'reference_id' => $reference?->getKey(),
            'note' => $note,
            'transaction_date' => $transactionDate,
        ]);
    }
}
