/**
 *
 * Reldens - DropsAnimationsEntityOverride
 *
 * Overrides the drops animations entity configuration for admin panel display with file upload settings for sprite assets.
 *
 */

const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { DropsAnimationsEntity } = require('../../../../generated-entities/entities/drops-animations-entity');

class DropsAnimationsEntityOverride extends DropsAnimationsEntity
{

    /**
     * @param {Object} extraProps
     * @param {Object} projectConfig
     * @returns {Object}
     */
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
