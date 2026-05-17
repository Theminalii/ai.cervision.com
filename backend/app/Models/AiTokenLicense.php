<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiTokenLicense extends Model
{
    protected $fillable = [
        'token_code',
        'status',
        'monthly_token_limit',
        'used_tokens',
        'start_date',
        'end_date',
        'owner_company_id',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }
}
