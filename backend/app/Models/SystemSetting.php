<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public function getValueAttribute(?string $value): mixed
    {
        if ($value === null) {
            return null;
        }

        try {
            $value = Crypt::decryptString($value);
        } catch (Throwable) {
            // Backward compatibility for existing plain JSON records.
        }

        $decoded = json_decode($value, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }

    public function setValueAttribute(mixed $value): void
    {
        $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);

        $this->attributes['value'] = Crypt::encryptString($encoded === false ? 'null' : $encoded);
    }
}
