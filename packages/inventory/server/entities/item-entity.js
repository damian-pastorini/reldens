/**
 *
 * Reldens - ItemEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { ItemsConst } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');

class ItemEntity extends AdminEntityProperties
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
                availableValues: [
                    {value: ItemsConst.TYPES.ITEM_BASE, label: 'Item Base'},
                    {value: ItemsConst.TYPES.EQUIPMENT, label: 'Equipment'},
                    {value: ItemsConst.TYPES.USABLE, label: 'Usable'},
                    {value: ItemsConst.TYPES.SINGLE, label: 'Single Instance'},
                    {value: ItemsConst.TYPES.SINGLE_EQUIPMENT, label: 'Single Instance Equipment'},
                    {value: ItemsConst.TYPES.SINGLE_USABLE, label: 'Single Instance Usable'}
                ],
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
