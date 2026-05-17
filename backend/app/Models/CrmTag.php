<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

class CrmTag extends Model
{
    protected $fillable = ['name', 'slug', 'color'];

    public function customers(): MorphToMany
    {
        return $this->morphedByMany(Customer::class, 'taggable', 'crm_taggables', 'crm_tag_id', 'taggable_id');
    }
}
