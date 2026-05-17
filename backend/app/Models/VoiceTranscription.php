<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoiceTranscription extends Model
{
    protected $fillable = [
        'message_id',
        'provider',
        'transcript',
        'confidence_score',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }
}
