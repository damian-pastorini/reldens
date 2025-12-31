/**
 *
 * Reldens - RoomsEntityOverride
 *
 * Extend rooms entity with custom properties for map file uploads and admin panel configuration.
 *
 */

const { RoomsConst } = require('../../constants');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('@reldens/server-utils');
const { RoomsEntity } = require('../../../../generated-entities/entities/rooms-entity');

class RoomsEntityOverride extends RoomsEntity
{

    /**
     * @param {Object} extraProps
     * @param {Object} projectConfig
     * @returns {Object}
     */
    static propertiesConfig(extraProps, projectConfig)
    {
        let config = super.propertiesConfig(extraProps);
        config.titleProperty = 'name';
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'maps');
        let bucketPath = RoomsConst.MAPS_BUCKET;
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'maps');
        config.properties.map_filename = {
            isRequired: true,
            isUpload: true,
            allowedTypes: AllowedFileTypes.TEXT,
            bucket,
            bucketPath,
            distFolder
        };
        config.properties.scene_images = {
            isRequired: true,
            isArray: ',',
            isUpload: true,
            allowedTypes: AllowedFileTypes.IMAGE,
            bucket,
            bucketPath,
            distFolder
        };
        config.bucket = bucket;
        config.bucketPath = bucketPath;
        config.navigationPosition = 700;
        return config;
    }

}

module.exports.RoomsEntityOverride = RoomsEntityOverride;
