<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthAndPerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_reports_database_status(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson(['status' => 'ok', 'database' => 'ok']);
    }

    public function test_root_returns_json_not_a_view(): void
    {
        $this->getJson('/')->assertOk()->assertJsonStructure(['name', 'api']);
    }

    public function test_current_user_endpoint_uses_a_bounded_number_of_queries(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create(['last_active_at' => now()]);
        $user->assignRole('super_admin');
        $user->preferences()->create();
        $user = $user->fresh();

        DB::enableQueryLog();
        $this->actingAs($user)->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.roles', ['super_admin'])
            ->assertJsonCount(6, 'data.permissions');
        $count = count(DB::getQueryLog());

        // roles + role permissions + direct permissions + preferences (+ small framework overhead)
        $this->assertLessThanOrEqual(6, $count, "GET /api/user ran {$count} queries");
    }

    public function test_logging_in_while_already_logged_in_still_returns_json(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create(['password' => 'secret123']);
        $spa = ['Origin' => 'http://localhost:5173', 'Referer' => 'http://localhost:5173/'];

        $this->withHeaders($spa)->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])->assertOk();
        $this->withHeaders($spa)->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }
}
