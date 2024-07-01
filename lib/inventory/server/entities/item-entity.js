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
            customData: {}
        };

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'description',
            'qty_limit',
            'uses_limit',
            'useTimeOut',
            'execTimeOut',
            'customData'
        ]);
        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ItemEntity = ItemEntity;
