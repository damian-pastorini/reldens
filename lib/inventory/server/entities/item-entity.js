/**
 *
 * Reldens - ItemEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { sc } = require('@reldens/utils');

class ItemEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            type: {
                type: 'reference',
                reference: 'items_types',
                isRequired: true
            },
            group_id: {
                type: 'reference',
                reference: 'items_group'
            },
            label: {
                isRequired: true
            },
            description: {},
            qty_limit: {
                type: 'number',
                isRequired: true
            },
            uses_limit: {
                type: 'number',
                isRequired: true
            },
            useTimeOut: {
                type: 'number'
            },
            execTimeOut: {
                type: 'number'
            },
            customData: {},
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties = sc.removeFromArray(listProperties, [
            'description',
            'qty_limit',
            'uses_limit',
            'useTimeOut',
            'execTimeOut',
            'customData'
        ]);
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ItemEntity = ItemEntity;
