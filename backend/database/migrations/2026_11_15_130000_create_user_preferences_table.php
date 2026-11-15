<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('theme', 10)->default('system');          // system | light | dark
            $table->unsignedSmallInteger('font_scale')->default(100);  // percent: 100–150
            $table->boolean('high_contrast')->default(false);
            $table->boolean('reduced_motion')->default(false);
            $table->string('tts_voice')->nullable();                   // browser voice name
            $table->decimal('tts_rate', 3, 2)->default(1.00);          // 0.50–2.00
            $table->string('stt_language', 10)->default('fil-PH');
            $table->boolean('save_history')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
