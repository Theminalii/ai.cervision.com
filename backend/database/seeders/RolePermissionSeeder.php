<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'Satış əlavə et', 'key' => 'sales_add', 'module' => 'sales'],
            ['name' => 'Satınalma əlavə et', 'key' => 'purchase_add', 'module' => 'purchases'],
            ['name' => 'Stok görüntülə', 'key' => 'stock_view', 'module' => 'stocks'],
            ['name' => 'Xərclər görüntülə', 'key' => 'expense_view', 'module' => 'expenses'],
            ['name' => 'Hesabatlar', 'key' => 'reports_view', 'module' => 'reports'],
            ['name' => 'Əmsallar dəyişdir', 'key' => 'coefficients_manage', 'module' => 'coefficients'],
            ['name' => 'İstifadəçi idarəetmə', 'key' => 'users_manage', 'module' => 'users'],
            ['name' => 'CRM görüntülə', 'key' => 'crm_view', 'module' => 'crm'],
            ['name' => 'CRM idarə et', 'key' => 'crm_manage', 'module' => 'crm'],
            ['name' => 'Omnichannel görüntülə', 'key' => 'omnichannel_view', 'module' => 'omnichannel'],
            ['name' => 'Omnichannel idarə et', 'key' => 'omnichannel_manage', 'module' => 'omnichannel'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['key' => $permission['key']],
                $permission + ['status' => 'active']
            );
        }

        $roles = [
            'Super Admin' => collect($permissions)->pluck('key')->all(),
            'Maliyyə Meneceri' => ['expense_view', 'reports_view'],
            'Satış Meneceri' => ['sales_add', 'stock_view', 'reports_view', 'crm_view', 'crm_manage', 'omnichannel_view', 'omnichannel_manage'],
            'Satış Nümayəndəsi' => ['sales_add', 'crm_view', 'crm_manage', 'omnichannel_view'],
            'Anbar Məsulu' => ['stock_view', 'purchase_add'],
            'Mühasib' => ['expense_view', 'reports_view'],
        ];

        foreach ($roles as $name => $keys) {
            $role = Role::updateOrCreate(
                ['name' => $name],
                ['description' => $name, 'status' => 'active']
            );

            $role->permissions()->sync(
                Permission::whereIn('key', $keys)->pluck('id')->all()
            );
        }
    }
}
