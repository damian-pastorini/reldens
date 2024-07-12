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

module.exports.ObjectsItemsRewardsEntity = ObjectsItemsRewardsEntity;
