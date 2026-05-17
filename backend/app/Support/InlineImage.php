<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;

class InlineImage
{
    protected const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    public static function rules(int $maxKilobytes = 2048): array
    {
        return [
            'required',
            'image',
            'mimetypes:' . implode(',', self::ALLOWED_MIME_TYPES),
            'max:' . $maxKilobytes,
        ];
    }

    public static function fromUpload(UploadedFile $file): string
    {
        return 'data:' . $file->getMimeType() . ';base64,' . base64_encode((string) file_get_contents($file->getRealPath()));
    }

    public static function isSafeDataUrl(string $value, int $maxBytes = 2097152): bool
    {
        if (! preg_match('/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+\/=\r\n]+)$/', $value, $matches)) {
            return false;
        }

        $decoded = base64_decode($matches[2], true);

        return $decoded !== false && strlen($decoded) <= $maxBytes;
    }
}
