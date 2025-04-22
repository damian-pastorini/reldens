/**
 *
 * Reldens - AdminDistHelper
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class AdminDistHelper
{

    static async removeBucketAndDistFiles(distPath, bucket, filesName)
    {
        if('string' !== typeof filesName){
            if(!sc.isArray(filesName)){
                Logger.error('Undefined files.', distPath, bucket, filesName);
            }
            return false;
        }
        let files = filesName.split(',');
        if(0 === files.length){
            return false;
        }
        for(let file of files){
            FileHandler.remove([bucket, file]);
            FileHandler.remove([distPath, file]);
        }
    }

    static async copyBucketFilesToDist(bucket, filesName, distPath)
    {
        if('string' !== typeof filesName){
            if(!sc.isArray(filesName)){
                Logger.error('Undefined files.', distPath, bucket, filesName);
            }
            return false;
        }
        let files = filesName.split(',');
        if(0 === files.length){
            return false;
        }
        for(let file of files){
            let result = FileHandler.copyFile([bucket, file], [distPath, file]);
            if(!result){
                Logger.error('File copy error.', FileHandler.error);
                return '';
            }
        }
    }

}

module.exports.AdminDistHelper = AdminDistHelper;
