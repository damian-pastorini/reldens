/**
 *
 * Reldens - MimeTypes
 *
 * Constants object-mapping file type categories to their allowed MIME types. Used for validating
 * file uploads by checking the file's MIME type against these allowed lists. Categories include
 * audio files (AAC, MP3, OGG, WAV, etc.), image files (PNG, JPEG, GIF, SVG, etc.), and text files
 * (JSON, plain text). Works in conjunction with AllowedFileTypes and TypeDeterminer for file validation.
 *
 */

module.exports.MimeTypes = {
    audio: [
        'audio/aac',
        'audio/midi',
        'audio/x-midi',
        'audio/mpeg',
        'audio/ogg',
        'application/ogg',
        'audio/opus',
        'audio/wav',
        'audio/webm',
        'audio/3gpp2'
    ],
    image: [
        'image/bmp',
        'image/gif',
        'image/jpeg',
        'image/png',
        'image/svg+xml',
        'image/vnd.microsoft.icon',
        'image/tiff',
        'image/webp'
    ],
    text: [
        'application/json',
        'application/ld+json',
        'text/plain',
    ]
};
