<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public function getValueAttribute(?string $value): mixed
    {
        return $value ? json_decode($value, true) : null;
    }

    public function setValueAttribute(mixed $value): void
    {
        $this->attributes['value'] = json_encode($value, JSON_UNESCAPED_UNICODE);
    }
}
