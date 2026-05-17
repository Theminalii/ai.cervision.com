<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'assigned_user_id',
        'company_id',
        'entity_type',
        'tax_id',
        'total_debt',
        'status',
        'crm_status',
        'source',
        'tags',
        'last_contact_at',
        'next_follow_up_at',
        'next_action',
        'crm_note',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'last_contact_at' => 'datetime',
            'next_follow_up_at' => 'datetime',
        ];
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(CrmCompany::class, 'company_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function debtTransactions(): MorphMany
    {
        return $this->morphMany(DebtTransaction::class, 'debtable');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(CrmContact::class, 'customer_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(CrmLead::class, 'customer_id');
    }

    public function deals(): HasMany
    {
        return $this->hasMany(CrmDeal::class, 'customer_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(CrmTask::class, 'customer_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(CrmActivity::class, 'customer_id');
    }

    public function tagsRelation(): MorphToMany
    {
        return $this->morphToMany(CrmTag::class, 'taggable', 'crm_taggables', 'taggable_id', 'crm_tag_id');
    }
}
