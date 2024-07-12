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

module.exports.RoomsReturnPointsEntity = RoomsReturnPointsEntity;
