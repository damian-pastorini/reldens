/**
 *
 * Reldens - StatsEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');
const { sc } = require('@reldens/utils');

class StatsEntity extends AdminEntityProperties
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
            description: {
                isRequired: true
            },
            base_value: {
                type: 'number',
                isRequired: true
            },
            customData: {},
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys = sc.removeFromArray(listPropertiesKeys, [
            'description',
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

module.exports.StatsEntity = StatsEntity;
