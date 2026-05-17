<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmDeal extends Model
{
    protected $fillable = [
        'pipeline_id',
        'stage_id',
        'owner_user_id',
        'customer_id',
        'company_id',
        'contact_id',
        'lead_id',
        'won_sale_id',
        'title',
        'expected_amount',
        'probability',
        'expected_close_date',
        'products',
        'lost_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'expected_amount' => 'float',
            'probability' => 'integer',
            'expected_close_date' => 'date',
            'products' => 'array',
        ];
    }

    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(CrmPipeline::class, 'pipeline_id');
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(CrmDealStage::class, 'stage_id');
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

    public function lead(): BelongsTo
    {
        return $this->belongsTo(CrmLead::class, 'lead_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(CrmTask::class, 'deal_id');
    }
}
