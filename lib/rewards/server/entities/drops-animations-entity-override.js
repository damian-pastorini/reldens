/**
 *
 * Reldens - DropsAnimationsEntityOverride
 *
 */

const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { DropsAnimationsEntity } = require('../../../../generated-entities/entities/drops-animations-entity');

class DropsAnimationsEntityOverride extends DropsAnimationsEntity
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let config = super.propertiesConfig(extraProps);
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'custom', 'sprites');
        let bucketPath = '/assets/custom/sprites/';
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'custom', 'sprites');
        config.properties.file = {
            isRequired: true,
            isUpload: true,
            allowedTypes: AllowedFileTypes.IMAGE,
            bucket,
            bucketPath,
            distFolder
        };
        config.bucket = bucket;
        config.bucketPath = bucketPath;
        return config;
    }

}

module.exports.DropsAnimationsEntityOverride = DropsAnimationsEntityOverride;
