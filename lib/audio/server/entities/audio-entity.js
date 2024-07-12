/**
 *
 * Reldens - AudioEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { AdminLocalProvider } = require('../../../admin/server/upload-file/admin-local-provider');
const { AudioHotPlugCallbacks } = require('../audio-hot-plug-callbacks');
const { AudioConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class AudioEntity extends EntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let titleProperty = 'audio_key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            files_name: {
                isRequired: true,
                isArray: ',',
                isUpload: true
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

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties = sc.removeFromArray(listProperties, ['config']);
        editProperties = sc.removeFromArray(editProperties, ['id']);
        let bucket = AdminLocalProvider.joinPath(projectConfig.bucketFullPath, 'assets', 'audio');
        let distFolder = AdminLocalProvider.joinPath(projectConfig.distPath, 'assets', 'audio');
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
            callbacks,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AudioEntity = AudioEntity;
