/**
 *
 * Reldens - ConfigEntity
 *
 */

const { AdminEntityProperties } = require('../../../admin/server/admin-entity-properties');

class ConfigEntity extends AdminEntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            scope: {
                isRequired: true
            },
            path: {
                isTitle: true,
                isRequired: true
            },
            value: {
                isRequired: true
            },
            type: {
                availableValues: [
                    {value: 't', label: 'Text'},
                    {value: 'i', label: 'Number'},
                    {value: 'b', label: 'Boolean'},
                    {value: 'j', label: 'JSON'}
                ],
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

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

module.exports.ConfigEntity = ConfigEntity;
