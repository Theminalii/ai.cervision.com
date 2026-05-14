<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Role\StoreRoleRequest;
use App\Http\Requests\Role\SyncRolePermissionsRequest;
use App\Http\Requests\Role\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        return RoleResource::collection(Role::with('permissions')->get());
    }

    public function store(StoreRoleRequest $request)
    {
        return new RoleResource(Role::create($request->validated()));
    }

    public function update(UpdateRoleRequest $request, Role $role)
    {
        $role->update($request->validated());

        return new RoleResource($role->load('permissions'));
    }

    public function syncPermissions(SyncRolePermissionsRequest $request, Role $role)
    {
        $role->permissions()->sync($request->permission_ids);

        return new RoleResource($role->load('permissions'));
    }
}
