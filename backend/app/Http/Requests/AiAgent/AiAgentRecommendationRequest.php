<?php

namespace App\Http\Requests\AiAgent;

use Illuminate\Foundation\Http\FormRequest;

class AiAgentRecommendationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'focus' => ['nullable', 'string', 'in:products,sales,purchases,stocks,users,customers,finance'],
        ];
    }
}
