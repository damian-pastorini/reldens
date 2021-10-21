/**
 *
 * Reldens - AudioEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { uploadFileFeature } = require('../../../admin/server/upload-file/upload-file.feature');
const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { MimeTypes } = require('../../../admin/server/upload-file/mime-types');
const { AudioConst } = require('../../constants');
const { Logger, sc } = require('@reldens/utils');

class AudioEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let properties = {
            id: {},
            audio_key: {
                isTitle: true,
                isRequired: true
            },
            files_name: {
                isRequired: true,
                isArray: true
            },
            uploadedFile: {
                isVirtual: true
            },
            config: {},
            room_id: {
                type: 'reference',
                reference: 'rooms'
            },
            category_id: {
                type: 'reference',
                reference: 'audio_categories'
            },
            enabled: {
                type: 'boolean'
            }
        };

        let arrayColumns = {files_name: {splitBy: ','}};

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let filterProperties = [...showProperties];
        let editProperties = [...showProperties];

        showProperties = sc.removeFromArray(showProperties, ['files_name']);
        listProperties = sc.removeFromArray(listProperties, ['files_name', 'config']);
        filterProperties = sc.removeFromArray(filterProperties, ['uploadedFile']);
        editProperties = sc.removeFromArray(editProperties, ['id', 'files_name']);

        let bucket = AdminLocalProvider.joinPath(projectConfig.bucketFullPath, 'assets', 'audio');
        let features = [
            uploadFileFeature({
                provider: new AdminLocalProvider({
                    bucket: bucket
                }),
                properties: {
                    file: 'uploadedFile',
                    key: 'files_name'
                },
                multiple: true,
                uploadPath: (record, filename) => {
                    return `${filename}`;
                },
                validation: {
                    mimeTypes: MimeTypes.audio
                },
            })
        ];

        let callbacks = {
            // @NOTE: we create audio files with this callback because the file_name update happens here when we use
            // the upload plugin.
            update: this.updateCallback(projectConfig, bucket),
            beforeDelete: this.beforeDeleteCallback(projectConfig, bucket)
        };

        return Object.assign({
            listProperties,
            showProperties,
            filterProperties,
            editProperties,
            properties,
            features,
            arrayColumns,
            bucketPath: '/'+AudioConst.AUDIO_BUCKET+'/',
            callbacks
        }, extraProps);
    }

    static beforeDeleteCallback(projectConfig, bucket)
    {
        return async (model, id, resource) => {
            let distPath = AdminLocalProvider.joinPath(projectConfig.projectRoot, 'dist', 'assets', 'audio');
            let files = model.files_name.split(',');
            for(let file of files){
                let fileFrom = AdminLocalProvider.joinPath(bucket, file);
                let fileTo = AdminLocalProvider.joinPath(distPath, file);
                await AdminLocalProvider.deleteFile(fileFrom);
                await AdminLocalProvider.deleteFile(fileTo);
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
            let distPath = AdminLocalProvider.joinPath(projectConfig.projectRoot, 'dist', 'assets', 'audio');
            let files = params.files_name.split(',');
            for(let file of files){
                let fileFrom = AdminLocalProvider.joinPath(bucket, file);
                let fileTo = AdminLocalProvider.joinPath(distPath, file);
                await AdminLocalProvider.copyFile(fileFrom, fileTo);
            }
            projectConfig.serverManager.audioManager.hotPlugNewAudio({
                newAudioModel: model,
                preparedParams,
                params,
                resource
            });
        };
    }

}

module.exports.AudioEntity = AudioEntity;
