/**
 *
 * Reldens - ItemEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { ItemsConst } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class ItemEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                isTitle: true,
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

        let listPropertiesKeys = Object.keys(properties);
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

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.ItemEntity = ItemEntity;
