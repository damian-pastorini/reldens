/**
 *
 * Reldens - RoomsChangePointsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RoomsChangePointsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            room_id: {
                type: 'reference',
                reference: 'rooms',
                isTitle: true,
                isRequired: true
            },
            tile_index: {
                type: 'number',
                isRequired: true
            },
            next_room_id: {
                type: 'reference',
                reference: 'rooms',
                isRequired: true
            },
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.RoomsChangePointsEntity = RoomsChangePointsEntity;
