<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaleResource extends JsonResource
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
            'sale_number' => $this->sale_number,
            'customer' => new CustomerResource($this->whenLoaded('customer')),
            'sales_representative' => new UserResource($this->whenLoaded('user')),
            'sale_type' => $this->sale_type,
            'payment_status' => $this->payment_status,
            'payment_method' => $this->payment_method,
            'subtotal' => (float) $this->subtotal,
            'vat_amount' => (float) $this->vat_amount,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'debt_amount' => (float) $this->debt_amount,
            'stock_output' => (bool) $this->stock_output,
            'note' => $this->note,
            'sale_date' => $this->sale_date?->toDateString(),
            'items' => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
                'stock_type' => $item->stock_type,
            ]),
        ];
    }
}
