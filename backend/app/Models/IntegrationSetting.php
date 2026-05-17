<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationSetting extends Model
{
    protected $fillable = [
        'channel',
        'enabled',
        'connection_type',
        'public_meta',
        'secret_meta',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'public_meta' => 'array',
            'secret_meta' => 'encrypted:array',
        ];
    }
}
