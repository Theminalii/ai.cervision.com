<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'sale_number',
        'customer_id',
        'user_id',
        'sale_type',
        'payment_status',
        'payment_method',
        'subtotal',
        'vat_amount',
        'total_amount',
        'paid_amount',
        'debt_amount',
        'stock_output',
        'note',
        'sale_date',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'date',
            'stock_output' => 'boolean',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}
