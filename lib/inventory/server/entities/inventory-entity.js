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

module.exports.InventoryEntity = InventoryEntity;
