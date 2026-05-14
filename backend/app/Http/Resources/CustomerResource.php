<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'assigned_user_id' => $this->assigned_user_id,
            'assigned_user' => $this->when(
                $this->relationLoaded('assignedUser'),
                fn () => [
                    'id' => $this->assignedUser?->id,
                    'name' => $this->assignedUser?->name,
                    'email' => $this->assignedUser?->email,
                ]
            ),
            'total_debt' => (float) $this->total_debt,
            'status' => $this->status,
        ];
    }
}
