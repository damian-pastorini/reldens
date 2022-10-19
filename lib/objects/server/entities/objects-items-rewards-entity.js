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

module.exports.ObjectsItemsRewardsEntity = ObjectsItemsRewardsEntity;
