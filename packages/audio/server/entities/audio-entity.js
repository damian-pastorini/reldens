/**
 *
 * Reldens - AudioEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { uploadFileFeature } = require('../../../admin/server/upload-file/upload-file.feature');
const { AudioHotPlugCallbacks } = require('../audio-hot-plug-callbacks');
const { MimeTypes } = require('../../../admin/server/upload-file/mime-types');
const { AudioConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class AudioEntity extends AdminEntityProperties
{

    static propertiesDefinition()
    {
        return {
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
    }

    static propertiesConfig(extraProps, projectConfig)
    {
        let properties = this.propertiesDefinition();
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
        let distFolder = AdminLocalProvider.joinPath(projectConfig.distPath, 'assets', 'audio');

        let features = [
            uploadFileFeature({
                provider: new AdminLocalProvider({
                    bucket: bucket
                }),
                properties: {
                    file: 'uploadedFile',
                    key: 'files_name'
                },
                multiple: false,
                uploadPath: (record, filename) => {
                    return `${filename}`;
                },
                validation: {
                    mimeTypes: MimeTypes.audio
                },
                propertiesDefinition: properties
            })
        ];

        let callbacks = {
            // @NOTE: we use the update callback because that's when the file_name is updated with the upload plugin.
            beforeUpdate: AudioHotPlugCallbacks.beforeUpdateCallback(projectConfig, bucket, distFolder),
            afterUpdate: AudioHotPlugCallbacks.afterUpdateCallback(projectConfig, bucket, distFolder),
            beforeDelete: AudioHotPlugCallbacks.beforeDeleteCallback(projectConfig, bucket, distFolder)
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

}

module.exports.AudioEntity = AudioEntity;
