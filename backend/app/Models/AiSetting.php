<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    protected $fillable = [
        'enabled',
        'provider',
        'model',
        'auto_reply_enabled',
        'operator_approval_required',
        'confidence_min',
        'daily_limit',
        'monthly_limit',
        'license_required',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'auto_reply_enabled' => 'boolean',
            'operator_approval_required' => 'boolean',
            'license_required' => 'boolean',
        ];
    }
}
