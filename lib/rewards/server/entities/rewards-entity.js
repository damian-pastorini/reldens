/**
 *
 * Reldens - RewardsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class RewardsEntity extends EntityProperties
{
    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true
            },
            item_id: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true
            },
            drop_rate: {
                type: 'number',
                isRequired: true
            },
            drop_quantity: {
                type: 'number',
                isRequired: true
            },
            is_unique: {
                type: 'boolean'
            },
            was_given: {
                type: 'boolean'
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

module.exports.RewardsEntity = RewardsEntity;
