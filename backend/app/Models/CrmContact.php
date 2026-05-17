<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmContact extends Model
{
    protected $fillable = [
        'company_id',
        'customer_id',
        'owner_user_id',
        'first_name',
        'last_name',
        'job_title',
        'phone',
        'email',
        'social_links',
        'is_primary',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'social_links' => 'array',
            'is_primary' => 'boolean',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(CrmLead::class, 'contact_id');
    }
}
