<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HumanHandoff extends Model
{
    protected $fillable = [
        'conversation_id',
        'message_id',
        'assigned_user_id',
        'reason',
        'status',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }
}
