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

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.ConfigEntity = ConfigEntity;
