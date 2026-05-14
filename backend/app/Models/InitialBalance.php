<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InitialBalance extends Model
{
    protected $fillable = [
        'bank_balance',
        'cash_balance',
        'customer_debts',
        'supplier_debts',
        'stock_value',
        'imported_by',
    ];

    public function importedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }
}
