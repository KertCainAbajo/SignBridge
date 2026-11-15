<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SignVocabulary extends Model
{
    protected $table = 'sign_vocabulary';

    protected $fillable = [
        'category_id', 'word', 'slug', 'description', 'level', 'media_type',
        'media_path', 'is_published', 'is_recognizable', 'model_label',
    ];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'is_recognizable' => 'boolean'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(VocabularyCategory::class, 'category_id');
    }

    public function lessons(): BelongsToMany
    {
        return $this->belongsToMany(LearningLesson::class, 'lesson_sign', 'sign_id', 'lesson_id');
    }
}
