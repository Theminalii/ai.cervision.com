<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
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
            'phone' => '+994' . fake()->numerify('5########'),
            'email' => fake()->safeEmail(),
            'address' => fake()->address(),
            'total_debt' => fake()->randomFloat(2, 0, 5000),
            'status' => 'active',
        ];
    }
}
