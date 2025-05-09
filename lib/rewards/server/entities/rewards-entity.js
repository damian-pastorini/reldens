/**
 *
 * Reldens - RewardsEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

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
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps,
            navigationPosition: 600
        };
    }

}

module.exports.RewardsEntity = RewardsEntity;
