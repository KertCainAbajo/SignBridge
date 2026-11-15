<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuizQuestion extends Model
{
    protected $fillable = ['quiz_id', 'type', 'prompt', 'sign_id', 'sort_order'];

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function sign(): BelongsTo
    {
        return $this->belongsTo(SignVocabulary::class, 'sign_id');
    }

    public function choices(): HasMany
    {
        return $this->hasMany(QuizChoice::class, 'question_id')->orderBy('sort_order');
    }
}
