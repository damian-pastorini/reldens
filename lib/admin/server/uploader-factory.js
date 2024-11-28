/**
 *
 * Reldens - UploaderFactory
 *
 */

const multer = require('multer');
const { FileHandler } = require('../../game/server/file-handler');
const { MimeTypes } = require('../../game/mime-types');
const { Logger } = require('@reldens/utils');

class UploaderFactory
{

    createUploader(fields, buckets, allowedFileTypes)
    {
        let storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, buckets[file.fieldname]);
            },
            filename: (req,file,cb) => {
                cb(null, file.originalname);
            }
        })
        return multer({
            storage,
            fileFilter: (req, file, cb) => {
                return this.checkFileType(file, allowedFileTypes[file.fieldname], cb);
            }
        }).fields(fields);
    }

    checkFileType(file, allowedFileTypes, cb)
    {
        if(!allowedFileTypes){
            return cb(null, true);
        }
        let allowedFileTypeCheck = this.convertToRegex(allowedFileTypes);
        if(!allowedFileTypeCheck){
            Logger.error('File type could not be converted to regex.', allowedFileTypes);
            return cb(null, false);
        }
        let extname = allowedFileTypeCheck.test(FileHandler.extension(file.originalname).toLowerCase());
        let mimetype = allowedFileTypeCheck.test(file.mimetype);
        if(mimetype && extname){
            return cb(null, true);
        }
        Logger.error('File type not supported.', {
            extension: extname,
            mimetype,
            allowedFileTypes: allowedFileTypeCheck
        });
        return cb(null, false);
    }

    convertToRegex(key)
    {
        if(!MimeTypes[key]){
            return false;
        }
        let types = MimeTypes[key].map(type => type.split('/').pop().replace('+', '\\+'));
        return new RegExp(types.join('|'));
    }

}

module.exports.UploaderFactory = UploaderFactory;
