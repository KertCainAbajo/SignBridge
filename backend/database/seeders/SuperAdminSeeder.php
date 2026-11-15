<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Creates the first super admin from SUPERADMIN_* env variables.
 * No credentials are hardcoded. If no password is set, a random one is printed once.
 */
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('SUPERADMIN_EMAIL');

        if (! $email) {
            $this->command?->warn('SUPERADMIN_EMAIL is not set in .env, skipping super admin creation.');

            return;
        }

        $existing = User::where('email', $email)->first();

        if ($existing) {
            $existing->syncRoles(['super_admin']);
            $this->command?->info("Super admin role ensured for {$email}.");

            return;
        }

        $password = env('SUPERADMIN_PASSWORD') ?: Str::password(16);

        $user = User::create([
            'name' => env('SUPERADMIN_NAME', 'SignBridge Admin'),
            'email' => $email,
            'password' => $password,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->assignRole('super_admin');
        $user->preferences()->create();

        $this->command?->info("Super admin created: {$email}");

        if (! env('SUPERADMIN_PASSWORD')) {
            $this->command?->warn("Generated password (shown once, change it after logging in): {$password}");
        }
    }
}
