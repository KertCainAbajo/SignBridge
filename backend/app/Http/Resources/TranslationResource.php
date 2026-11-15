<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\TranslationHistory */
class TranslationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source' => $this->source,
            'text' => $this->text,
            'avg_confidence' => $this->avg_confidence,
            'model_version' => $this->model_version,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
