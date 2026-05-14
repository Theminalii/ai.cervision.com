<?php

namespace App\Http\Requests\Party;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertSupplierRequest extends FormRequest
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
        $supplierId = $this->route('supplier')?->id ?? $this->route('supplier');

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50', 'unique:suppliers,phone,'.$supplierId],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string'],
            'total_debt' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:active,passive'],
        ];
    }
}
