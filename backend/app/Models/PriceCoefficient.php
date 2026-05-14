<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PriceCoefficient extends Model
{
    protected $fillable = [
        'category_id',
        'brand_id',
        'supplier_id',
        'category_coefficient',
        'supplier_coefficient',
        'brand_coefficient',
        'company_coefficient',
        'vat_percent',
        'active_from',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'active_from' => 'date',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
