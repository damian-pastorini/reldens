/**
 *
 * Reldens - UploaderFactory
 *
 */

const multer = require('multer');
const { FileHandler } = require('../../game/server/file-handler');

class UploaderFactory
{

    constructor()
    {
        this.allowedFileTypes = /jpeg|jpg|png|gif/;
    }

    createUploader(fields) // , maxFieldSize = 2000000
    {
        return multer().fields(fields);
        /*
        {
            storage: multer.memoryStorage(),
            fileFilter: this.checkFileType,
            limits: { fileSize: maxFieldSize }
        }
        */
    }

    create(fileInputName, bucket, allowedFileTypes = [], maxFileSize = 2000000)
    {
        let storage = multer.diskStorage({
            destination: bucket, // './uploads/'
            filename: (req, file, cb) => {
                cb(null, file.fieldname + '-' + Date.now() + FileHandler.extension(file.originalname));
            }
        });
        let upload = multer({
            storage: storage,
            limits: { fileSize: maxFileSize },
            fileFilter: (req, file, cb) => {
                this.checkFileType(file, cb);
            }
        });
        return {storage, upload};
    }

    checkFileType(file, cb)
    {
        const extname = this.allowedFileTypes.test(FileHandler.extension(file.originalname).toLowerCase());
        const mimetype = this.allowedFileTypes.test(file.mimetype);
        if(mimetype && extname){
            return cb(null, true);
        }
        cb('Error: Images Only!');
    }

}

module.exports.UploaderFactory = UploaderFactory;
