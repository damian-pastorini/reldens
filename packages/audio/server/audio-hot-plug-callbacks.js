/**
 *
 * Reldens - AudioHotPlugCallbacks
 *
 */

const { AdminDistHelper } = require('../../admin/server/upload-file/admin-dist-helper');
const { sc } = require('@reldens/utils');

class AudioHotPlugCallbacks
{

    static beforeDeleteCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        return async (model, id, resource) => {
            await this.removeAudio(distFolder, bucket, model, projectConfig, id, resource, true);
        };
    }

    static beforeUpdateCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        // eslint-disable-next-line no-unused-vars
        return async (model, id, preparedParams, params, originalParams, resource) => {
            let isEnabled = Boolean(sc.get(params, 'enabled', true));
            if(isEnabled && preparedParams.files_name !== model.files_name){
                await AdminDistHelper.copyBucketFilesToDist(bucket, params.files_name, distFolder);
            }
        };
    }

    static afterUpdateCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        return async (model, id, preparedParams, params, originalParams, resource) => {
            if(1 < Object.keys(params).length && params === preparedParams){
                return false;
            }
            false === Boolean(model.enabled)
                ? await this.removeAudio(distFolder, bucket, model, projectConfig, id, resource)
                : await this.updateAudio(params, bucket, model, distFolder, projectConfig, preparedParams, resource);
        };
    }

    static async updateAudio(params, bucket, model, distFolder, projectConfig, preparedParams, resource)
    {
        let dataServer = projectConfig.serverManager.dataServer;
        let fullAudioData = await dataServer.getEntity('audio').loadByIdWithRelations(model.id);
        projectConfig.serverManager.audioManager.hotPlugAudio({
            newAudioModel: fullAudioData,
            preparedParams,
            params,
            resource
        });
    }

    static async removeAudio(distFolder, bucket, model, projectConfig, id, resource, removeFiles = false)
    {
        if(true === removeFiles) {
            await AdminDistHelper.removeBucketAndDistFiles(distFolder, bucket, model.files_name);
        }
        projectConfig.serverManager.audioManager.hotUnplugAudio({
            newAudioModel: model,
            id: Number(id),
            resource
        });
    }

}

module.exports.AudioHotPlugCallbacks = AudioHotPlugCallbacks;
