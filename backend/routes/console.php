<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\GmailChannelService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function (GmailChannelService $gmailChannelService): void {
    $gmailChannelService->maybeAutoSync(20, 60);
})->everyMinute()->name('gmail-auto-sync')->withoutOverlapping();
