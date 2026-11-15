<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vocabulary_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_published')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('sign_vocabulary', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('vocabulary_categories')->restrictOnDelete();
            $table->string('word');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('level', 20)->default('beginner')->index(); // beginner | intermediate | advanced
            $table->string('media_type', 10)->nullable();               // image | video
            $table->string('media_path')->nullable();
            $table->boolean('is_published')->default(false);
            // Links this entry to a class of the trained recognition model.
            $table->boolean('is_recognizable')->default(false)->index();
            $table->string('model_label', 64)->nullable()->unique();
            $table->timestamps();

            $table->index(['category_id', 'is_published']);
        });

        Schema::create('favorite_signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sign_id')->constrained('sign_vocabulary')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'sign_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorite_signs');
        Schema::dropIfExists('sign_vocabulary');
        Schema::dropIfExists('vocabulary_categories');
    }
};
