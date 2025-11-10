/**
 *
 * Reldens - ObjectsItemsRewardsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ObjectsItemsRewardsEntity extends EntityProperties
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
            object_id: {
                type: 'reference',
                reference: 'objects',
                isRequired: true,
                dbType: 'int'
            },
            item_key: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true,
                dbType: 'varchar'
            },
            reward_item_key: {
                type: 'reference',
                reference: 'items_item',
                isRequired: true,
                dbType: 'varchar'
            },
            reward_quantity: {
                type: 'number',
                dbType: 'int'
            },
            reward_item_is_required: {
                type: 'boolean',
                dbType: 'tinyint'
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

module.exports.ObjectsItemsRewardsEntity = ObjectsItemsRewardsEntity;
