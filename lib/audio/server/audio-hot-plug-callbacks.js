/**
 *
 * Reldens - AudioHotPlugCallbacks
 *
 * Provides callback methods for hot-plugging audio files in the admin panel.
 *
 */

const { AdminDistHelper } = require('@reldens/cms/lib/admin-dist-helper');
const { sc } = require('@reldens/utils');

class AudioHotPlugCallbacks
{

    /**
     * @param {Object} projectConfig
     * @param {string} bucket
     * @param {string} distFolder
     * @returns {function|boolean}
     */
    static beforeDeleteCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        return async (model, id, resource) => {
            await this.removeAudio(distFolder, bucket, model, projectConfig, id, resource, true);
        };
    }

    /**
     * @param {Object} projectConfig
     * @param {string} bucket
     * @param {string} distFolder
     * @returns {function|boolean}
     */
    static beforeUpdateCallback(projectConfig, bucket, distFolder)
    {
        if(false === projectConfig.isHotPlugEnabled){
            return false;
        }
        return async (model, id, preparedParams, params) => {
            let isEnabled = Boolean(sc.get(params, 'enabled', true));
            if(isEnabled && preparedParams.files_name !== model.files_name){
                await AdminDistHelper.copyBucketFilesToDist(bucket, params.files_name, distFolder);
            }
        };
    }

    /**
     * @param {Object} projectConfig
     * @param {string} bucket
     * @param {string} distFolder
     * @returns {function|boolean}
     */
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

    /**
     * @param {Object} params
     * @param {string} bucket
     * @param {Object} model
     * @param {string} distFolder
     * @param {Object} projectConfig
     * @param {Object} preparedParams
     * @param {Object} resource
     * @returns {Promise<void>}
     */
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

    /**
     * @param {string} distFolder
     * @param {string} bucket
     * @param {Object} model
     * @param {Object} projectConfig
     * @param {number} id
     * @param {Object} resource
     * @param {boolean} [removeFiles]
     * @returns {Promise<void>}
     */
    static async removeAudio(distFolder, bucket, model, projectConfig, id, resource, removeFiles = false)
    {
        if(true === removeFiles){
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
