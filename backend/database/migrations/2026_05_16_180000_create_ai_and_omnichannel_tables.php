<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table): void {
            $table->id();
            $table->boolean('enabled')->default(false);
            $table->string('provider')->default('openai');
            $table->string('model')->nullable();
            $table->boolean('auto_reply_enabled')->default(false);
            $table->boolean('operator_approval_required')->default(true);
            $table->unsignedInteger('confidence_min')->default(75);
            $table->unsignedInteger('daily_limit')->nullable();
            $table->unsignedInteger('monthly_limit')->nullable();
            $table->boolean('license_required')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_provider_credentials', function (Blueprint $table): void {
            $table->id();
            $table->string('provider')->unique();
            $table->text('api_key')->nullable();
            $table->text('token_code')->nullable();
            $table->longText('meta')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_token_licenses', function (Blueprint $table): void {
            $table->id();
            $table->string('token_code')->unique();
            $table->enum('status', ['active', 'expired', 'revoked'])->default('active');
            $table->unsignedInteger('monthly_token_limit')->default(0);
            $table->unsignedInteger('used_tokens')->default(0);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('owner_company_id')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_usage_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('provider')->nullable();
            $table->string('model')->nullable();
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->decimal('cost_estimate', 12, 4)->default(0);
            $table->string('module')->nullable();
            $table->string('action_type')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('company_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_conversation_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('module')->default('omnichannel');
            $table->unsignedBigInteger('conversation_id')->nullable();
            $table->text('prompt_summary')->nullable();
            $table->text('response_summary')->nullable();
            $table->unsignedInteger('confidence_score')->default(0);
            $table->json('data_sources')->nullable();
            $table->boolean('sent_automatically')->default(false);
            $table->timestamps();
        });

        Schema::create('ai_automation_rules', function (Blueprint $table): void {
            $table->id();
            $table->boolean('auto_reply_all')->default(false);
            $table->boolean('work_hours_only')->default(false);
            $table->boolean('product_stock_only')->default(true);
            $table->boolean('price_questions')->default(true);
            $table->boolean('order_questions')->default(true);
            $table->boolean('hide_finance_data')->default(true);
            $table->boolean('low_confidence_handoff')->default(true);
            $table->boolean('analyze_voice')->default(true);
            $table->boolean('analyze_image')->default(true);
            $table->boolean('create_lead_if_missing')->default(true);
            $table->boolean('human_handoff_enabled')->default(true);
            $table->json('blacklist_words')->nullable();
            $table->json('template_replies')->nullable();
            $table->json('business_hours')->nullable();
            $table->timestamps();
        });

        Schema::create('integration_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('channel')->unique();
            $table->boolean('enabled')->default(false);
            $table->string('connection_type')->nullable();
            $table->json('public_meta')->nullable();
            $table->longText('secret_meta')->nullable();
            $table->timestamps();
        });

        Schema::create('channel_accounts', function (Blueprint $table): void {
            $table->id();
            $table->string('channel');
            $table->string('name')->nullable();
            $table->string('external_id')->nullable();
            $table->string('username')->nullable();
            $table->string('status')->default('disconnected');
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('channel_sessions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('channel_account_id')->nullable()->constrained('channel_accounts')->nullOnDelete();
            $table->string('channel');
            $table->string('status')->default('disconnected');
            $table->text('session_payload')->nullable();
            $table->text('qr_payload')->nullable();
            $table->timestamp('last_connected_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('conversations', function (Blueprint $table): void {
            $table->id();
            $table->string('channel');
            $table->foreignId('channel_account_id')->nullable()->constrained('channel_accounts')->nullOnDelete();
            $table->string('external_thread_id')->nullable()->index();
            $table->string('customer_name')->nullable();
            $table->string('customer_identifier')->nullable()->index();
            $table->string('customer_phone')->nullable();
            $table->string('customer_username')->nullable();
            $table->enum('status', ['new', 'replied', 'pending', 'human_required'])->default('new');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('last_message_id')->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('conversation_customer_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('crm_leads')->nullOnDelete();
            $table->string('match_type')->default('phone');
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->string('channel');
            $table->enum('direction', ['incoming', 'outgoing']);
            $table->enum('message_type', ['text', 'audio', 'image', 'video', 'file'])->default('text');
            $table->enum('sender_type', ['customer', 'ai', 'operator', 'system'])->default('customer');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body')->nullable();
            $table->string('external_message_id')->nullable()->index();
            $table->unsignedInteger('confidence_score')->nullable();
            $table->string('status')->default('received');
            $table->json('data_sources')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });

        Schema::create('message_attachments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->string('type');
            $table->string('mime_type')->nullable();
            $table->string('path')->nullable();
            $table->string('url')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_reply_suggestions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->text('reply_text');
            $table->unsignedInteger('confidence_score')->default(0);
            $table->json('data_sources')->nullable();
            $table->text('risk_warning')->nullable();
            $table->boolean('approval_required')->default(true);
            $table->boolean('was_sent')->default(false);
            $table->timestamps();
        });

        Schema::create('message_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->nullable()->constrained('conversations')->nullOnDelete();
            $table->foreignId('message_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->string('channel')->nullable();
            $table->string('action');
            $table->string('status')->default('ok');
            $table->text('detail')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('voice_transcriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->string('provider')->nullable();
            $table->text('transcript')->nullable();
            $table->unsignedInteger('confidence_score')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('image_analyses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->string('provider')->nullable();
            $table->text('summary')->nullable();
            $table->json('matched_products')->nullable();
            $table->json('ocr_payload')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('human_handoffs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason')->nullable();
            $table->string('status')->default('open');
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('human_handoffs');
        Schema::dropIfExists('image_analyses');
        Schema::dropIfExists('voice_transcriptions');
        Schema::dropIfExists('message_logs');
        Schema::dropIfExists('ai_reply_suggestions');
        Schema::dropIfExists('message_attachments');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversation_customer_links');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('channel_sessions');
        Schema::dropIfExists('channel_accounts');
        Schema::dropIfExists('integration_settings');
        Schema::dropIfExists('ai_automation_rules');
        Schema::dropIfExists('ai_conversation_logs');
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_token_licenses');
        Schema::dropIfExists('ai_provider_credentials');
        Schema::dropIfExists('ai_settings');
    }
};
