/**
 *
 * Reldens - ObjectsItemsRewardsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ObjectsItemsRewardsEntity extends EntityProperties
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
            item_key: {
                isRequired: true
            },
            reward_item_key: {
                isRequired: true
            },
            reward_quantity: {
                type: 'number',
                isRequired: true
            },
            reward_item_is_required: {
                type: 'boolean'
            }
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.ObjectsItemsRewardsEntity = ObjectsItemsRewardsEntity;
