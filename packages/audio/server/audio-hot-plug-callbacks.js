/**
 *
 * Reldens - AudioHotPlugCallbacks
 *
 */

const { AdminDistHelper } = require('../../admin/server/upload-file/admin-dist-helper');

class AudioHotPlugCallbacks
{

    static beforeDeleteCallback(projectConfig, bucket, distFolder)
    {
        return async (model, id, resource) => {
            await AdminDistHelper.removeBucketAndDistFiles(
                distFolder,
                bucket,
                model.files_name
            );
            projectConfig.serverManager.audioManager.hotUnplugAudio({
                newAudioModel: model,
                id: Number(id),
                resource
            });
        };
    }

    static updateCallback(projectConfig, bucket, distFolder)
    {
        return async (model, id, preparedParams, params, originalParams, resource) => {
            if(true !== Boolean(model.enabled)){
                return false;
            }
            if(params.files_name){
                await AdminDistHelper.copyBucketFilesToDist(
                    bucket,
                    model.files_name,
                    distFolder
                );
            }
            // @TODO - How about an audio update?? -----------------------------------------------< FIX >
            projectConfig.serverManager.audioManager.hotPlugNewAudio({
                newAudioModel: model,
                preparedParams,
                params,
                resource
            });
        };
    }

}

module.exports.AudioHotPlugCallbacks = AudioHotPlugCallbacks;
