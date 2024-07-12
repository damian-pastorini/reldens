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
                reference: 'items_item'
            },
            modifier_id: {
                type: 'reference',
                reference: 'rewards_modifiers'
            },
            experience: {
                type: 'number'
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
            },
            has_drop_body: {
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

module.exports.RewardsEntity = RewardsEntity;
