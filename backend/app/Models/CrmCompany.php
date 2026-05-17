<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class CrmCompany extends Model
{
    protected $fillable = [
        'owner_user_id',
        'customer_id',
        'name',
        'tax_id',
        'email',
        'phone',
        'website',
        'segment',
        'status',
        'address',
        'notes',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(CrmContact::class, 'company_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(CrmDeal::class, 'company_id');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(CrmTag::class, 'taggable', 'crm_taggables', 'taggable_id', 'crm_tag_id');
    }
}
