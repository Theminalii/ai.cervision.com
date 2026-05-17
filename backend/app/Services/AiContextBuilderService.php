<?php

namespace App\Services;

use App\Models\Conversation;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;

class AiContextBuilderService
{
    public function build(Conversation $conversation, string $message): array
    {
        $customer = $conversation->links()->with('customer.sales')->first()?->customer;
        $matchedProducts = $this->searchProducts($message);

        return [
            'customer' => $customer ? [
                'id' => $customer->id,
                'name' => $customer->name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'total_debt' => (float) $customer->total_debt,
                'crm_status' => $customer->crm_status,
                'recent_sales' => $customer->sales()->latest('sale_date')->take(5)->get(['id', 'sale_number', 'total_amount', 'sale_date']),
            ] : null,
            'products' => $matchedProducts,
            'faq' => [
                'delivery' => 'Çatdırılma və ödəniş şərtləri şirkət ayarlarına görə operator tərəfindən təsdiqlənir.',
                'payment' => 'Ödəniş üsulları: nağd, bank və razılaşdırılmış kredit xətti.',
            ],
            'conversation' => [
                'channel' => $conversation->channel,
                'customer_name' => $conversation->customer_name,
            ],
        ];
    }

    protected function searchProducts(string $message): array
    {
        $terms = collect(preg_split('/\s+/u', trim($message)) ?: [])
            ->map(fn (?string $term) => trim((string) $term))
            ->filter(fn (string $term) => mb_strlen($term) >= 3)
            ->values();

        if ($terms->isEmpty()) {
            return [];
        }

        $query = Product::query()->with(['category', 'brand', 'stock']);
        $query->where(function ($builder) use ($terms): void {
            foreach ($terms as $term) {
                $builder->orWhere('name', 'like', '%'.$term.'%')
                    ->orWhere('code', 'like', '%'.$term.'%');
            }
        });

        return $query->take(5)->get()->map(function (Product $product): array {
            return [
                'id' => $product->id,
                'name' => $product->name,
                'code' => $product->code,
                'sale_price' => (float) $product->sale_price,
                'cash_price' => (float) ($product->cash_price ?? $product->sale_price),
                'stock' => (float) ($product->stock?->real_quantity ?? 0),
                'brand' => $product->brand?->name,
                'category' => $product->category?->name,
            ];
        })->all();
    }
}
