/**
 *
 * Reldens - AudioEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { AudioHotPlugCallbacks } = require('../audio-hot-plug-callbacks');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('../../../game/server/file-handler');
const { AudioConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class AudioEntity extends EntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let titleProperty = 'audio_key';
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'audio');
        let bucketPath = '/assets/audio/';
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'audio');
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            files_name: {
                isRequired: true,
                isArray: ',',
                isUpload: true,
                allowedTypes: AllowedFileTypes.AUDIO,
                bucket,
                bucketPath,
                distFolder
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
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, ['config']);
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);
        let callbacks = {
            // @NOTE: we use the update callback because that's when the file_name is updated with the upload plugin.
            beforeUpdate: AudioHotPlugCallbacks.beforeUpdateCallback(projectConfig, bucket, distFolder),
            afterUpdate: AudioHotPlugCallbacks.afterUpdateCallback(projectConfig, bucket, distFolder),
            beforeDelete: AudioHotPlugCallbacks.beforeDeleteCallback(projectConfig, bucket, distFolder)
        };

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            bucketPath: AudioConst.AUDIO_BUCKET+'/',
            bucket,
            callbacks,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AudioEntity = AudioEntity;
