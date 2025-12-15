/**
 *
 * Reldens - AllowedFileTypes
 *
 * Constants object defining the allowed file type categories for file upload validation and MIME type
 * detection. Used by FileHandler and other utilities to categorize and validate file types (audio files,
 * image files, text files) during uploads, asset processing, and file operations.
 *
 */

module.exports.AllowedFileTypes = {
    AUDIO: 'audio',
    IMAGE: 'image',
    TEXT: 'text'
};
