/**
 *
 * Reldens - InventoryEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class InventoryEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            owner_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            item_id: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true
            },
            qty: {
                type: 'number',
                isRequired: true
            },
            remaining_uses: {
                type: 'number'
            },
            is_active: {
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

module.exports.InventoryEntity = InventoryEntity;
