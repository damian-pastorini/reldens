/**
 *
 * Reldens - LocaleEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class LocaleEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'locale';
        let properties = {
            id: {},
            [titleProperty]: {
                isRequired: true
            },
            language_code: {
                isRequired: true
            },
            country_code: {
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

module.exports.LocaleEntity = LocaleEntity;
