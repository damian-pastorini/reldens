/**
 *
 * Reldens - RoomsReturnPointsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RoomsReturnPointsEntity extends EntityProperties
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
            direction: {
                isRequired: true
            },
            x: {
                type: 'number',
                isRequired: true
            },
            y: {
                type: 'number',
                isRequired: true
            },
            is_default: {
                type: 'boolean',
                isRequired: true
            },
            from_room_id: {
                type: 'reference',
                reference: 'rooms'
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

module.exports.RoomsReturnPointsEntity = RoomsReturnPointsEntity;
