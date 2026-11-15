<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\UserPreference */
class PreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'theme' => $this->theme,
            'font_scale' => (int) $this->font_scale,
            'high_contrast' => (bool) $this->high_contrast,
            'reduced_motion' => (bool) $this->reduced_motion,
            'tts_voice' => $this->tts_voice,
            'tts_rate' => (float) $this->tts_rate,
            'stt_language' => $this->stt_language,
            'save_history' => (bool) $this->save_history,
        ];
    }
}
