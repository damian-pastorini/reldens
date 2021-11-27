/**
 *
 * Reldens - AudioHotPlugCallbacks
 *
 */

const { AdminLocalProvider } = require('../../admin/server/upload-file/admin-local-provider');
const { Logger } = require('@reldens/utils');

class AudioHotPlugCallbacks
{

    static beforeDeleteCallback(projectConfig, bucket)
    {
        return async (model, id, resource) => {
            let {distPath, files} = this.getDistAudioFiles(projectConfig, model);
            if(0 < files.length){
                for(let file of files){
                    await AdminLocalProvider.deleteFile([bucket, file]);
                    await AdminLocalProvider.deleteFile([distPath, file]);
                }
            }
            projectConfig.serverManager.audioManager.hotUnplugAudio({
                newAudioModel: model,
                id: Number(id),
                resource
            });
        };
    }

    static updateCallback(projectConfig, bucket)
    {
        return async (model, result, id, preparedParams, params, resource) => {
            if(!params.files_name){
                Logger.error('Missing result data:', params);
                return;
            }
            let {distPath, files} = this.getDistAudioFiles(projectConfig, model);
            if(0 < files.length){
                for(let file of files){
                    await AdminLocalProvider.copyFile([bucket, file], [distPath, file]);
                }
            }
            projectConfig.serverManager.audioManager.hotPlugNewAudio({
                newAudioModel: model,
                preparedParams,
                params,
                resource
            });
        };
    }

    static getDistAudioFiles(projectConfig, model)
    {
        let distPath = AdminLocalProvider.joinPath(projectConfig.projectRoot, 'dist', 'assets', 'audio');
        let files = model.files_name.split(',');
        return {distPath, files};
    }

}

module.exports.AudioHotPlugCallbacks = AudioHotPlugCallbacks;