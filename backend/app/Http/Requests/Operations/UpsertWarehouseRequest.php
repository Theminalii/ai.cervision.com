<?php

namespace App\Http\Requests\Operations;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpsertWarehouseRequest extends FormRequest
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
        $warehouseId = $this->route('warehouse')?->id ?? $this->route('warehouse');

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:100', 'unique:warehouses,code,' . $warehouseId],
            'address' => ['nullable', 'string', 'max:255'],
            'capacity' => ['required', 'numeric', 'min:0'],
            'used_capacity' => ['required', 'numeric', 'min:0'],
            'manager_name' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:active,passive'],
        ];
    }
}
