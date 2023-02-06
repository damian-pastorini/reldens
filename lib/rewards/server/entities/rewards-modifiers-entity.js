/**
 *
 * Reldens - RewardsModifierEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RewardsModifiersEntity extends EntityProperties
{
    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                type: 'string',
                isRequired: true
            },
            property_key: {
                type: 'string',
                isRequired: true
            },
            operation: {
                type: 'number',
                isRequired: true
            },
            value: {
                type: 'string',
                isRequired: true
            },
            minValue: {
                type: 'string'
            },
            maxValue: {
                type: 'string'
            },
            minProperty: {
                type: 'string'
            },
            maxProperty: {
                type: 'string'
            }
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

module.exports.RewardsModifiersEntity = RewardsModifiersEntity;
