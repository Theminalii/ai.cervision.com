<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class DebtTransaction extends Model
{
    protected $fillable = [
        'debtable_type',
        'debtable_id',
        'type',
        'amount',
        'reference_type',
        'reference_id',
        'note',
        'transaction_date',
    ];

    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
        ];
    }

    public function debtable(): MorphTo
    {
        return $this->morphTo();
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
