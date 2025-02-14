/**
 *
 * Reldens - AdminDistHelper
 *
 */

const { FileHandler } = require('../../game/server/file-handler');
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
            FileHandler.removeSync([bucket, file]);
            FileHandler.removeSync([distPath, file]);
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
            await FileHandler.copyFile([bucket, file], [distPath, file]);
        }
    }

}

module.exports.AdminDistHelper = AdminDistHelper;
