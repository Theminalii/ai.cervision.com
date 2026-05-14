<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PriceCoefficientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'brand_id' => $this->brand_id,
            'supplier_id' => $this->supplier_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'supplier' => new SupplierResource($this->whenLoaded('supplier')),
            'category_coefficient' => (float) $this->category_coefficient,
            'supplier_coefficient' => (float) $this->supplier_coefficient,
            'brand_coefficient' => (float) $this->brand_coefficient,
            'company_coefficient' => (float) $this->company_coefficient,
            'vat_percent' => (float) $this->vat_percent,
            'active_from' => $this->active_from?->toDateString(),
            'status' => $this->status,
        ];
    }
}
