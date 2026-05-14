<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WarehouseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->address,
            'capacity' => (float) $this->capacity,
            'used_capacity' => (float) $this->used_capacity,
            'available_capacity' => round((float) $this->capacity - (float) $this->used_capacity, 3),
            'utilization_percent' => (float) $this->capacity > 0
                ? round(((float) $this->used_capacity / (float) $this->capacity) * 100, 1)
                : 0,
            'manager_name' => $this->manager_name,
            'status' => $this->status,
            'transfers_from' => WarehouseTransferResource::collection($this->whenLoaded('transfersFrom')),
            'transfers_to' => WarehouseTransferResource::collection($this->whenLoaded('transfersTo')),
        ];
    }
}
