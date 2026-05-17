<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChannelAccount extends Model
{
    protected $fillable = [
        'channel',
        'name',
        'external_id',
        'username',
        'status',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ChannelSession::class);
    }
}
