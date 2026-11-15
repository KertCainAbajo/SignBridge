<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TranslationHistoryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        $this->user = User::factory()->create();
        $this->user->assignRole('user');
    }

    public function test_user_can_save_and_list_translations(): void
    {
        $this->actingAs($this->user)->postJson('/api/translations', [
            'source' => 'sign',
            'text' => '  MAHAL KITA  ',
            'avg_confidence' => 0.91,
            'model_version' => 'personal-knn-1',
        ])->assertCreated()->assertJsonPath('data.text', 'MAHAL KITA');

        $this->actingAs($this->user)->getJson('/api/translations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.source', 'sign')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_invalid_translation_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->postJson('/api/translations', ['source' => 'video', 'text' => '', 'avg_confidence' => 3])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['source', 'text', 'avg_confidence']);
    }

    public function test_saving_is_blocked_when_history_is_disabled(): void
    {
        $this->user->preferences()->create(['save_history' => false]);

        $this->actingAs($this->user)
            ->postJson('/api/translations', ['source' => 'text', 'text' => 'hello'])
            ->assertStatus(409);

        $this->assertDatabaseCount('translation_histories', 0);
    }

    public function test_users_cannot_see_or_delete_each_others_history(): void
    {
        $other = User::factory()->create();
        $theirs = $other->translationHistories()->create(['source' => 'text', 'text' => 'private']);

        $this->actingAs($this->user)->getJson('/api/translations')->assertJsonCount(0, 'data');
        $this->actingAs($this->user)->deleteJson("/api/translations/{$theirs->id}")->assertNotFound();
        $this->assertDatabaseHas('translation_histories', ['id' => $theirs->id]);
    }

    public function test_user_can_delete_one_and_clear_all(): void
    {
        $a = $this->user->translationHistories()->create(['source' => 'text', 'text' => 'one']);
        $this->user->translationHistories()->create(['source' => 'speech', 'text' => 'two']);

        $this->actingAs($this->user)->deleteJson("/api/translations/{$a->id}")->assertNoContent();
        $this->assertDatabaseCount('translation_histories', 1);

        $this->actingAs($this->user)->deleteJson('/api/translations')->assertNoContent();
        $this->assertDatabaseCount('translation_histories', 0);
    }

    public function test_history_can_be_filtered_by_source(): void
    {
        $this->user->translationHistories()->create(['source' => 'sign', 'text' => 'A']);
        $this->user->translationHistories()->create(['source' => 'speech', 'text' => 'B']);

        $this->actingAs($this->user)->getJson('/api/translations?source=speech')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.text', 'B');
    }
}
