/**
 *
 * Reldens - RoomsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { RoomsConst } = require('../../constants');
const { sc } = require('@reldens/utils');

class RoomsEntity extends EntityProperties
{

    static propertiesDefinition()
    {
        let titleProperty = 'name';
        return {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            title: {
                isRequired: true
            },
            map_filename: {
                isRequired: true,
                isUpload: true
            },
            scene_images: {
                isRequired: true,
                isArray: true,
                isUpload: true
            },
            room_class_key: {}
        };
    }

    static propertiesConfig(extraProps, projectConfig)
    {
        let properties = this.propertiesDefinition();
        // @TODO - BETA - Fix multiple images upload.
        let arrayColumns = {}; // {scene_images: {splitBy: ','}};

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let filterProperties = [...showProperties];
        let editProperties = [...showProperties];

        showProperties = sc.removeFromArray(showProperties, ['map_filename', 'scene_images', 'room_class_key']);
        listProperties = sc.removeFromArray(listProperties, ['map_filename', 'scene_images', 'room_class_key']);
        filterProperties = sc.removeFromArray(filterProperties, ['uploadedFile', 'uploadedImagesFile']);
        editProperties = sc.removeFromArray(editProperties, ['id', 'map_filename', 'scene_images']);

        return {
            listProperties,
            showProperties,
            filterProperties,
            editProperties,
            properties,
            arrayColumns,
            titleProperty: 'name',
            bucketPath: RoomsConst.MAPS_BUCKET + '/',
            ...extraProps
        };
    }

}

module.exports.RoomsEntity = RoomsEntity;
