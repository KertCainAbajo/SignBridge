<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningLesson extends Model
{
    protected $fillable = ['category_id', 'title', 'slug', 'summary', 'content', 'level', 'sort_order', 'is_published'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'sort_order' => 'integer'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(VocabularyCategory::class, 'category_id');
    }

    public function signs(): BelongsToMany
    {
        return $this->belongsToMany(SignVocabulary::class, 'lesson_sign', 'lesson_id', 'sign_id')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    public function progress(): HasMany
    {
        return $this->hasMany(LessonProgress::class, 'lesson_id');
    }
}
