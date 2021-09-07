/**
 *
 * Reldens - GroupEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class GroupEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            key: {
                isRequired: true
            },
            label: {
                isTitle: true,
                isRequired: true
            },
            description: {},
            sort: {
                type: 'number'
            },
            items_limit: {
                type: 'number',
                isRequired: true
            },
            limit_per_item: {
                type: 'number',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'description',
            'sort',
            'items_limit',
            'limit_per_item'
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

module.exports.GroupEntity = GroupEntity;
