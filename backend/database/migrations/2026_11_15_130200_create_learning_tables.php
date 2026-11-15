<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('vocabulary_categories')->restrictOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('summary', 500)->nullable();
            $table->longText('content')->nullable(); // sanitized server-side before saving
            $table->string('level', 20)->default('beginner')->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('lesson_sign', function (Blueprint $table) {
            $table->foreignId('lesson_id')->constrained('learning_lessons')->cascadeOnDelete();
            $table->foreignId('sign_id')->constrained('sign_vocabulary')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);

            $table->primary(['lesson_id', 'sign_id']);
        });

        Schema::create('lesson_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained('learning_lessons')->cascadeOnDelete();
            $table->string('status', 20)->default('in_progress'); // in_progress | completed
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'lesson_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_progress');
        Schema::dropIfExists('lesson_sign');
        Schema::dropIfExists('learning_lessons');
    }
};
