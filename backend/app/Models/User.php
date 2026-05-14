<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function assignedCustomers(): HasMany
    {
        return $this->hasMany(Customer::class, 'assigned_user_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'created_by');
    }

    public function initialBalances(): HasMany
    {
        return $this->hasMany(InitialBalance::class, 'imported_by');
    }

    public function hasPermission(string $permissionKey): bool
    {
        if ($this->role?->name === 'Super Admin') {
            return true;
        }

        return $this->role?->permissions()->where('key', $permissionKey)->exists() ?? false;
    }

    public function isSalesRepresentative(): bool
    {
        return $this->role?->name === 'Satış Nümayəndəsi';
    }

    public function canAssignCustomers(): bool
    {
        return in_array($this->role?->name, ['Super Admin', 'Satış Meneceri'], true);
    }
}
