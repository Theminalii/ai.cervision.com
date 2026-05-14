<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
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
            'purchase_number' => $this->purchase_number,
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'payment_method' => $this->payment_method,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'debt_amount' => (float) $this->debt_amount,
            'road_cost' => (float) $this->road_cost,
            'customs_cost' => (float) $this->customs_cost,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'note' => $this->note,
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'order_quantity' => (float) $item->order_quantity,
                'actual_received_quantity' => (float) $item->actual_received_quantity,
                'purchase_price' => (float) $item->purchase_price,
                'distributed_extra_cost' => (float) $item->distributed_extra_cost,
                'final_unit_cost' => (float) $item->final_unit_cost,
                'total_cost' => (float) $item->total_cost,
            ]),
        ];
    }
}
