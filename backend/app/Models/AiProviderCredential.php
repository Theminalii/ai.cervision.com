<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiProviderCredential extends Model
{
    protected $fillable = [
        'provider',
        'api_key',
        'token_code',
        'meta',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'api_key' => 'encrypted',
            'token_code' => 'encrypted',
            'meta' => 'encrypted:array',
            'is_active' => 'boolean',
        ];
    }
}
