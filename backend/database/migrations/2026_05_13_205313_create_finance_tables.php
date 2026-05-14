<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['cash', 'bank']);
            $table->decimal('balance', 14, 2)->default(0);
            $table->enum('status', ['active', 'passive'])->default('active');
            $table->timestamps();
        });

        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('cash_accounts')->restrictOnDelete();
            $table->enum('type', ['income', 'expense']);
            $table->string('source_type');
            $table->unsignedBigInteger('source_id')->nullable();
            $table->decimal('amount', 14, 2);
            $table->string('description');
            $table->date('transaction_date');
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->enum('expense_type', ['official', 'cash']);
            $table->enum('payment_method', ['cash', 'bank']);
            $table->decimal('amount', 14, 2);
            $table->text('note')->nullable();
            $table->date('expense_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('debt_transactions', function (Blueprint $table) {
            $table->id();
            $table->morphs('debtable');
            $table->enum('type', ['debt', 'payment']);
            $table->decimal('amount', 14, 2);
            $table->nullableMorphs('reference');
            $table->text('note')->nullable();
            $table->date('transaction_date');
            $table->timestamps();
        });

        Schema::create('initial_balances', function (Blueprint $table) {
            $table->id();
            $table->decimal('bank_balance', 14, 2)->default(0);
            $table->decimal('cash_balance', 14, 2)->default(0);
            $table->decimal('customer_debts', 14, 2)->default(0);
            $table->decimal('supplier_debts', 14, 2)->default(0);
            $table->decimal('stock_value', 14, 2)->default(0);
            $table->foreignId('imported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('initial_balances');
        Schema::dropIfExists('debt_transactions');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('cash_accounts');
    }
};
