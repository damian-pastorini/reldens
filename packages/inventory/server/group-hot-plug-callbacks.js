/**
 *
 * Reldens - GroupHotPlugCallbacks
 *
 */

const { AdminDistHelper } = require('../../admin/server/upload-file/admin-dist-helper');
const { Logger } = require('@reldens/utils');

class GroupHotPlugCallbacks
{

    static beforeDeleteCallback(projectConfig, bucket, distFolder)
    {
        return async (model, id, resource) => {
            await AdminDistHelper.removeBucketAndDistFiles(
                distFolder,
                bucket,
                model.files_name
            );
            projectConfig.serverManager.inventory.hotUnplugAudio({
                newAudioModel: model,
                id: Number(id),
                resource
            });
        };
    }

    static updateCallback(projectConfig, bucket, distFolder)
    {
        return async (model, id, preparedParams, params, resource) => {
            if(!params.files_name){
                Logger.error('Missing result data:', params);
                return false;
            }
            await AdminDistHelper.copyBucketFilesToDist(
                bucket,
                model.files_name,
                distFolder
            );
            projectConfig.serverManager.inventory.hotPlugNewAudio({
                newAudioModel: model,
                preparedParams,
                params,
                resource
            });
        };
    }

}

module.exports.GroupHotPlugCallbacks = GroupHotPlugCallbacks;
