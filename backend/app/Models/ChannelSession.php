<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChannelSession extends Model
{
    protected $fillable = [
        'channel_account_id',
        'channel',
        'status',
        'session_payload',
        'qr_payload',
        'last_connected_at',
        'expires_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'session_payload' => 'encrypted',
            'qr_payload' => 'encrypted',
            'last_connected_at' => 'datetime',
            'expires_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function channelAccount(): BelongsTo
    {
        return $this->belongsTo(ChannelAccount::class);
    }
}
