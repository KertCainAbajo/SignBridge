<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreferencesAndRolesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_user_can_update_preferences(): void
    {
        $user = $this->userWithRole('user');

        $this->actingAs($user)->patchJson('/api/preferences', [
            'theme' => 'dark',
            'font_scale' => 125,
            'tts_rate' => 1.25,
            'save_history' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.theme', 'dark')
            ->assertJsonPath('data.font_scale', 125)
            ->assertJsonPath('data.save_history', false);

        $this->assertDatabaseHas('user_preferences', ['user_id' => $user->id, 'theme' => 'dark']);
    }

    public function test_invalid_preferences_are_rejected(): void
    {
        $this->actingAs($this->userWithRole('user'))
            ->patchJson('/api/preferences', ['theme' => 'neon', 'font_scale' => 400, 'tts_rate' => 9])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['theme', 'font_scale', 'tts_rate']);
    }

    public function test_regular_user_cannot_access_admin_routes(): void
    {
        $this->actingAs($this->userWithRole('user'))
            ->getJson('/api/admin/overview')
            ->assertForbidden();
    }

    public function test_admin_and_super_admin_can_view_overview(): void
    {
        foreach (['admin', 'super_admin'] as $role) {
            $this->actingAs($this->userWithRole($role))
                ->getJson('/api/admin/overview')
                ->assertOk()
                ->assertJsonStructure(['data' => ['users_total', 'users_active_7d', 'signs_total']]);
        }
    }

    public function test_only_super_admin_has_admin_management_permission(): void
    {
        $this->assertFalse($this->userWithRole('admin')->can('admins.manage'));
        $this->assertTrue($this->userWithRole('super_admin')->can('admins.manage'));
    }

    public function test_deactivated_user_session_is_rejected(): void
    {
        $user = $this->userWithRole('user');
        $user->forceFill(['is_active' => false])->save();

        $this->actingAs($user)->getJson('/api/user')->assertForbidden();
    }
}
