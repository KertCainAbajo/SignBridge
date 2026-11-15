<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /** Permission => roles that receive it (super_admin receives everything). */
    public const PERMISSIONS = [
        'users.manage' => ['admin'],       // manage ordinary user accounts
        'content.manage' => ['admin'],     // categories, vocabulary, lessons, supported signs
        'quizzes.manage' => ['admin'],
        'analytics.view' => ['admin'],
        'admins.manage' => [],             // super admin only
        'settings.manage' => [],           // super admin only
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (['user', 'admin', 'super_admin'] as $role) {
            Role::findOrCreate($role, 'web');
        }

        foreach (self::PERMISSIONS as $permission => $roles) {
            Permission::findOrCreate($permission, 'web');
        }

        foreach (['admin'] as $roleName) {
            $role = Role::findByName($roleName, 'web');
            $role->syncPermissions(array_keys(array_filter(
                self::PERMISSIONS,
                fn (array $roles) => in_array($roleName, $roles, true),
            )));
        }

        Role::findByName('super_admin', 'web')->syncPermissions(array_keys(self::PERMISSIONS));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
