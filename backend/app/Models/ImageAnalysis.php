<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImageAnalysis extends Model
{
    protected $fillable = [
        'message_id',
        'provider',
        'summary',
        'matched_products',
        'ocr_payload',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'matched_products' => 'array',
            'ocr_payload' => 'array',
            'meta' => 'array',
        ];
    }
}
