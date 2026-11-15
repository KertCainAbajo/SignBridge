<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'theme' => ['sometimes', Rule::in(['system', 'light', 'dark'])],
            'font_scale' => ['sometimes', 'integer', Rule::in([100, 112, 125, 150])],
            'high_contrast' => ['sometimes', 'boolean'],
            'reduced_motion' => ['sometimes', 'boolean'],
            'tts_voice' => ['sometimes', 'nullable', 'string', 'max:255'],
            'tts_rate' => ['sometimes', 'numeric', 'between:0.5,2'],
            'stt_language' => ['sometimes', Rule::in(['fil-PH', 'en-PH', 'en-US'])],
            'save_history' => ['sometimes', 'boolean'],
        ];
    }
}
