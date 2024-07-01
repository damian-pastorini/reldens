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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.RoomsChangePointsEntity = RoomsChangePointsEntity;
