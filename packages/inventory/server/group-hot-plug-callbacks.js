/**
 *
 * Reldens - GroupHotPlugCallbacks
 *
 */

const { AdminDistHelper } = require('../../admin/server/upload-file/admin-dist-helper');

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
            /*
            projectConfig.serverManager.inventory.hotUnplugAudio({
                newAudioModel: model,
                id: Number(id),
                resource
            });
            */
        };
    }

    static updateCallback(projectConfig, bucket, distFolder)
    {
        return async (model, id, preparedParams, params, originalParams, resource) => {
            if(params.files_name){
                await AdminDistHelper.copyBucketFilesToDist(
                    bucket,
                    model.files_name,
                    distFolder
                );
            }
            /*
            projectConfig.serverManager.inventory.hotPlugNewAudio({
                newAudioModel: model,
                preparedParams,
                params,
                resource
            });
            */
        };
    }

}

module.exports.GroupHotPlugCallbacks = GroupHotPlugCallbacks;
