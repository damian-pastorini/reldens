/**
 *
 * Reldens - AdminLocalProvider
 *
 */

const fs = require('fs');
const path = require('path');
const { Logger, sc } = require('@reldens/utils');

class AdminLocalProvider
{

    constructor(options)
    {
        if(!fs.existsSync(options.bucket)){
            throw new Error('Directory not found: ' + options.bucket);
        }
        this.isWin32 = process.platform === 'win32';
    }

    async upload(uploadedFile, key)
    {
        if(!uploadedFile){
            return false;
        }
        // adjusting file path according to OS:
        const filePath = this.isWin32 ? this.path(key) : this.path(key).slice(1);
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
        await fs.promises.copyFile(uploadedFile.path, filePath);
    }

    async delete(key, bucket, actionContext)
    {
        try {
            await fs.promises.unlink(this.isWin32 ? this.path(key, bucket) : this.path(key, bucket).slice(1));
        } catch (err) {
            // Logger.error(err);
        }
    }

    path(key, bucket)
    {
        // Windows does not require the '/' in path, while UNIX system does
        return this.isWin32 ? `${path.join(bucket || this.bucket, key)}` : `/${path.join(bucket || this.bucket, key)}`;
    }

    static joinPath(...paths)
    {
        return path.join(...paths);
    }

    static async copyFile(from, to)
    {
        let origin = sc.isArray(from) ? this.joinPath(...from) : from;
        let dest = sc.isArray(to) ? this.joinPath(...to) : to;
        try {
            return await fs.promises.copyFile(origin, dest);
        } catch (error) {
            Logger.error(error.message);
            return false;
        }
    }

    static async deleteFile(filePath)
    {
        try {
            let deleteFile = sc.isArray(filePath) ? this.joinPath(...filePath) : filePath
            await fs.promises.unlink(deleteFile);
        } catch (err) {
            // Logger.error(err);
        }
    }

}

module.exports.AdminLocalProvider = AdminLocalProvider;
