/**
 *
 * Reldens - RoomsChangePointsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class RoomsChangePointsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true,
                dbType: 'int'
            },
            tile_index: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            next_room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true,
                dbType: 'int'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.RoomsChangePointsEntity = RoomsChangePointsEntity;
