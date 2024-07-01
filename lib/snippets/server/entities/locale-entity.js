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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: showPropertiesKeys,
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.LocaleEntity = LocaleEntity;
