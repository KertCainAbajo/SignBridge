<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VocabularyCategory extends Model
{
    protected $fillable = ['name', 'slug', 'description', 'sort_order', 'is_published'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'sort_order' => 'integer'];
    }

    public function signs(): HasMany
    {
        return $this->hasMany(SignVocabulary::class, 'category_id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(LearningLesson::class, 'category_id');
    }
}
