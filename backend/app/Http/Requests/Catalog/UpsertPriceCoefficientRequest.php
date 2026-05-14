<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertPriceCoefficientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['nullable', 'exists:categories,id'],
            'brand_id' => ['nullable', 'exists:brands,id'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'category_coefficient' => ['required', 'numeric', 'min:0'],
            'supplier_coefficient' => ['required', 'numeric', 'min:0'],
            'brand_coefficient' => ['required', 'numeric', 'min:0'],
            'company_coefficient' => ['required', 'numeric', 'min:0'],
            'vat_percent' => ['required', 'numeric', 'min:0'],
            'active_from' => ['required', 'date'],
            'status' => ['required', 'in:active,passive'],
        ];
    }
}
