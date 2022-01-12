/**
 *
 * Reldens - ModifiersEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ModifiersEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            item_id: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true
            },
            key: {
                isTitle: true,
                isRequired: true
            },
            property_key: {
                isRequired: true
            },
            operation: {
                availableValues: [
                    {value: 1, label: 'Increment'},
                    {value: 2, label: 'Decrease'},
                    {value: 3, label: 'Divide'},
                    {value: 4, label: 'Multiply'},
                    {value: 5, label: 'Increment Percentage'},
                    {value: 6, label: 'Decrease Percentage'},
                    {value: 7, label: 'Set'},
                    {value: 8, label: 'Method'},
                    {value: 9, label: 'Set Number'}
                ],
                isRequired: true
            },
            value: {
                isRequired: true
            },
            maxProperty: {}
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

module.exports.ModifiersEntity = ModifiersEntity;
