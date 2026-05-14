<?php

namespace Database\Factories;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_code' => strtoupper(fake()->bothify('PRD-###')),
            'name' => fake()->words(3, true),
            'category_id' => Category::query()->inRandomOrder()->value('id'),
            'brand_id' => Brand::query()->inRandomOrder()->value('id'),
            'cash_sale_price' => fake()->randomFloat(2, 10, 500),
            'official_sale_price' => fake()->randomFloat(2, 10, 600),
            'price_type' => 'automatic',
            'cost_price' => fake()->randomFloat(2, 5, 300),
            'is_active' => true,
            'minimum_stock' => fake()->randomFloat(3, 1, 50),
        ];
    }
}
