/**
 *
 * Reldens - RoomsReturnPointsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class RoomsReturnPointsEntity extends EntityProperties
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
            direction: {
                isRequired: true,
                dbType: 'varchar'
            },
            x: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            y: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            is_default: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            from_room_id: {
                type: 'reference',
                reference: 'rooms',
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

module.exports.RoomsReturnPointsEntity = RoomsReturnPointsEntity;
