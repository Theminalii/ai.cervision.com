<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAppearanceSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'compact_sidebar' => ['required', 'boolean'],
            'hover_expand' => ['required', 'boolean'],
            'dense_tables' => ['required', 'boolean'],
            'theme' => ['required', 'in:light,dark,system'],
        ];
    }
}
