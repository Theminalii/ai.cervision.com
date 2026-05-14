<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'product_code' => $this->product_code,
            'name' => $this->name,
            'description' => $this->description,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'brand' => new BrandResource($this->whenLoaded('brand')),
            'image' => $this->image,
            'cash_sale_price' => (float) $this->cash_sale_price,
            'official_sale_price' => (float) $this->official_sale_price,
            'price_type' => $this->price_type,
            'cost_price' => (float) $this->cost_price,
            'is_active' => (bool) $this->is_active,
            'minimum_stock' => (float) $this->minimum_stock,
            'stock' => new StockResource($this->whenLoaded('stock')),
        ];
    }
}
