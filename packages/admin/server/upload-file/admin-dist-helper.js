/**
 *
 * Reldens - AdminDistHelper
 *
 */

const { AdminLocalProvider } = require('./admin-local-provider');

class AdminDistHelper
{

    static async removeBucketAndDistFiles(distPath, bucket, filesName)
    {
        let files = filesName.split(',');
        if(0 === files.length){
            return false;
        }
        for(let file of files){
            await AdminLocalProvider.deleteFile([bucket, file]);
            await AdminLocalProvider.deleteFile([distPath, file]);
        }
    }

    static async copyBucketFilesToDist(bucket, filesName, distPath)
    {
        let files = filesName.split(',');
        if (0 === files.length) {
            return false;
        }
        for(let file of files){
            await AdminLocalProvider.copyFile([bucket, file], [distPath, file]);
        }
    }

}

module.exports.AdminDistHelper = AdminDistHelper;
