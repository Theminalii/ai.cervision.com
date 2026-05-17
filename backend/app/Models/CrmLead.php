<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmLead extends Model
{
    protected $fillable = [
        'owner_user_id',
        'customer_id',
        'company_id',
        'contact_id',
        'title',
        'name',
        'company_name',
        'phone',
        'email',
        'source',
        'status',
        'score',
        'expected_value',
        'follow_up_date',
        'lost_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'follow_up_date' => 'date',
            'expected_value' => 'float',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(CrmContact::class, 'contact_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(CrmDeal::class, 'lead_id');
    }
}
