<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPreference extends Model
{
    protected $fillable = [
        'theme', 'font_scale', 'high_contrast', 'reduced_motion',
        'tts_voice', 'tts_rate', 'stt_language', 'save_history',
    ];

    /** Explicit defaults so a freshly created model matches the DB defaults. */
    protected $attributes = [
        'theme' => 'system',
        'font_scale' => 100,
        'high_contrast' => false,
        'reduced_motion' => false,
        'tts_rate' => 1.00,
        'stt_language' => 'fil-PH',
        'save_history' => true,
    ];

    protected function casts(): array
    {
        return [
            'font_scale' => 'integer',
            'high_contrast' => 'boolean',
            'reduced_motion' => 'boolean',
            'tts_rate' => 'float',
            'save_history' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
