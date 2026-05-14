<?php

namespace Database\Factories;

use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Supplier>
 */
class SupplierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'phone' => '+994' . fake()->numerify('1########'),
            'email' => fake()->companyEmail(),
            'address' => fake()->address(),
            'total_debt' => fake()->randomFloat(2, 0, 5000),
            'status' => 'active',
        ];
    }
}
