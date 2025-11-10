/**
 *
 * Reldens - AudioEntityOverride
 *
 */

const { AudioEntity } = require('../../../../generated-entities/entities/audio-entity');
const { AudioHotPlugCallbacks } = require('../audio-hot-plug-callbacks');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { AudioConst } = require('../../constants');
const { FileHandler } = require('@reldens/server-utils');

class AudioEntityOverride extends AudioEntity
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let config = super.propertiesConfig(extraProps);
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'audio');
        let bucketPath = '/assets/audio/';
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'audio');
        config.properties.files_name = {
            isRequired: true,
            isArray: ',',
            isUpload: true,
            allowedTypes: AllowedFileTypes.AUDIO,
            bucket,
            bucketPath,
            distFolder
        };
        config.listProperties.splice(config.listProperties.indexOf('config'), 1);
        config.navigationPosition = 1100;
        config.bucketPath = AudioConst.AUDIO_BUCKET+'/';
        config.bucket = bucket;
        config.callbacks = {
            // @NOTE: we use the update callback because that's when the file_name is updated with the upload plugin.
            beforeUpdate: AudioHotPlugCallbacks.beforeUpdateCallback(projectConfig, bucket, distFolder),
            afterUpdate: AudioHotPlugCallbacks.afterUpdateCallback(projectConfig, bucket, distFolder),
            beforeDelete: AudioHotPlugCallbacks.beforeDeleteCallback(projectConfig, bucket, distFolder)
        };
        return config;
    }

}

module.exports.AudioEntityOverride = AudioEntityOverride;
