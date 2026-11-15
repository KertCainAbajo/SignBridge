<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTranslationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->text)) {
            $this->merge(['text' => trim($this->text)]);
        }
    }

    public function rules(): array
    {
        return [
            'source' => ['required', Rule::in(['sign', 'speech', 'text'])],
            'text' => ['required', 'string', 'max:5000'],
            'avg_confidence' => ['nullable', 'numeric', 'between:0,1'],
            'model_version' => ['nullable', 'string', 'max:32'],
        ];
    }
}
