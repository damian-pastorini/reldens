/**
 *
 * Reldens - ConfigEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ConfigEntity extends EntityProperties
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
                type: 'reference',
                reference: 'config_types',
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
