/**
 *
 * Reldens - RewardsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class RewardsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true,
                dbType: 'int'
            },
            item_id: {
                type: 'reference',
                reference: 'items_item',
                dbType: 'int'
            },
            modifier_id: {
                type: 'reference',
                reference: 'rewards_modifiers',
                dbType: 'int'
            },
            experience: {
                type: 'number',
                dbType: 'int'
            },
            drop_rate: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            drop_quantity: {
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            is_unique: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            was_given: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            has_drop_body: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
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

module.exports.RewardsEntity = RewardsEntity;
