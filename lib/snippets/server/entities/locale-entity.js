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
        let properties = {
            id: {},
            locale: {
                isTitle: true,
                isRequired: true
            },
            language_code: {
                isRequired: true
            },
            country_code: {
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

module.exports.LocaleEntity = LocaleEntity;
