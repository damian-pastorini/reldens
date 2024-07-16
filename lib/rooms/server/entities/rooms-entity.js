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
                allowedTypes: AllowedFileTypes.IMAGE,
                bucket
            },
            scene_images: {
                isRequired: true,
                isArray: ',',
                isUpload: true,
                allowedTypes: AllowedFileTypes.IMAGE,
                bucket
            },
            room_class_key: {}
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id']);

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
