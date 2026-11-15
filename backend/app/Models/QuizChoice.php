<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizChoice extends Model
{
    protected $fillable = ['question_id', 'label', 'sign_id', 'is_correct', 'sort_order'];

    /** Never leak the answer key to learners by accident. */
    protected $hidden = ['is_correct'];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean'];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(QuizQuestion::class, 'question_id');
    }

    public function sign(): BelongsTo
    {
        return $this->belongsTo(SignVocabulary::class, 'sign_id');
    }
}
