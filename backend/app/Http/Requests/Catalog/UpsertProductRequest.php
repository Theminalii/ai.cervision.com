<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertProductRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $productId = $this->route('product')?->id ?? $this->route('product');

        return [
            'product_code' => ['required', 'string', 'max:255', 'unique:products,product_code,'.$productId],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category_id' => ['required', 'exists:categories,id'],
            'brand_id' => ['required', 'exists:brands,id'],
            'image' => ['nullable', 'string', 'max:2048'],
            'cash_sale_price' => ['required', 'numeric', 'min:0'],
            'official_sale_price' => ['required', 'numeric', 'min:0'],
            'price_type' => ['required', 'in:automatic,manual'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'minimum_stock' => ['required', 'numeric', 'min:0'],
            'initial_real_quantity' => ['nullable', 'numeric', 'min:0'],
            'initial_official_quantity' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
