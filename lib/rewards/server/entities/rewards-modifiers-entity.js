/**
 *
 * Reldens - RewardsModifierEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class RewardsModifiersEntity extends EntityProperties
{
    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                type: 'string',
                isTitle: true,
                isRequired: true
            },
            property_key: {
                type: 'string',
                isRequired: true
            },
            operation: {
                availableValues: [
                    { value: 1, label: 'Increment' },
                    { value: 2, label: 'Decrease' },
                    { value: 3, label: 'Divide' },
                    { value: 4, label: 'Multiply' },
                    { value: 5, label: 'Increment Percentage' },
                    { value: 6, label: 'Decrease Percentage' },
                    { value: 7, label: 'Set' },
                    { value: 8, label: 'Method' },
                    { value: 9, label: 'Set Number' }
                ],
                isRequired: true
            },
            value: {
                isRequired: true
            },
            minValue: {},
            maxValue: {},
            minProperty: {},
            maxProperty: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'minValue',
            'maxValue',
            'minProperty',
            'maxProperty'
        ]);
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
