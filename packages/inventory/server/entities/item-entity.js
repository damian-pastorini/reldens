/**
 *
 * Reldens - ItemEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
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
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'description',
            'qty_limit',
            'uses_limit',
            'useTimeOut',
            'execTimeOut'
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
