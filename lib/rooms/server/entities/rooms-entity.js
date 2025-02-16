/**
 *
 * Reldens - RoomsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { RoomsConst } = require('../../constants');
const { AllowedFileTypes } = require('../../../game/allowed-file-types');
const { FileHandler } = require('../../../game/server/file-handler');
const { sc } = require('@reldens/utils');

class RoomsEntity extends EntityProperties
{

    static propertiesConfig(extraProps, projectConfig)
    {
        let titleProperty = 'name';
        let bucket = FileHandler.joinPaths(projectConfig.bucketFullPath, 'assets', 'maps');
        let bucketPath = '/assets/maps/';
        let distFolder = FileHandler.joinPaths(projectConfig.distPath, 'assets', 'maps');
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            title: {
                isRequired: true
            },
            map_filename: {
                isRequired: true,
                isUpload: true,
                allowedTypes: AllowedFileTypes.TEXT,
                bucket,
                bucketPath,
                distFolder
            },
            scene_images: {
                isRequired: true,
                isArray: ',',
                isUpload: true,
                allowedTypes: AllowedFileTypes.IMAGE,
                bucket,
                bucketPath,
                distFolder
            },
            room_class_key: {},
            server_url: {},
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            bucketPath: RoomsConst.MAPS_BUCKET + '/',
            bucket,
            ...extraProps
        };
    }

}

module.exports.RoomsEntity = RoomsEntity;
