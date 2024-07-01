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
        let titleProperty = 'path';
        let properties = {
            id: {},
            scope: {
                isRequired: true
            },
            [titleProperty]: {
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

        return {
            listProperties: listPropertiesKeys,
            showProperties: listPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ConfigEntity = ConfigEntity;
