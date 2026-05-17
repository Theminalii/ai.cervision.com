<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmReportSnapshot extends Model
{
    protected $fillable = ['report_type', 'snapshot_date', 'payload', 'meta'];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'payload' => 'array',
            'meta' => 'array',
        ];
    }
}
