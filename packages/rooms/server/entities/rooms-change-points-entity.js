/**
 *
 * Reldens - RoomsChangePointsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class RoomsChangePointsEntity extends AdminEntityProperties
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

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.RoomsChangePointsEntity = RoomsChangePointsEntity;
