<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** Requests from the SPA origin get session (cookie) auth. */
    private array $spa = ['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_user_can_register_and_gets_user_role_and_default_preferences(): void
    {
        $this->withHeaders($this->spa)->postJson('/api/register', [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'juan@example.com')
            ->assertJsonPath('data.roles', ['user'])
            ->assertJsonPath('data.preferences.theme', 'system')
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticated('web');
    }

    public function test_registration_validates_input(): void
    {
        $this->withHeaders($this->spa)->postJson('/api/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_can_log_in_and_out(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);
        $user->assignRole('user');

        $this->withHeaders($this->spa)
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        $this->withHeaders($this->spa)->getJson('/api/user')->assertOk();

        $this->withHeaders($this->spa)->postJson('/api/logout')->assertNoContent();
        $this->assertGuest('web');
    }

    public function test_wrong_password_is_rejected(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);

        $this->withHeaders($this->spa)
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-pass1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->assertGuest('web');
    }

    public function test_deactivated_user_cannot_log_in(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);
        $user->forceFill(['is_active' => false])->save();

        $this->withHeaders($this->spa)
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertUnprocessable();

        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited(): void
    {
        $user = User::factory()->create(['password' => 'secret123']);

        for ($i = 0; $i < 5; $i++) {
            $this->withHeaders($this->spa)->postJson('/api/login', ['email' => $user->email, 'password' => 'bad']);
        }

        $this->withHeaders($this->spa)
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertTooManyRequests();
    }

    public function test_guest_cannot_access_protected_routes(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/preferences')->assertUnauthorized();
    }
}
