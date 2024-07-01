/**
 *
 * Reldens - SnippetEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class SnippetEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            locale_id: {
                type: 'reference',
                reference: 'locale',
                isRequired: true
            },
            key: {
                isRequired: true
            },
            value: {
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
            ...extraProps
        };
    }

}

module.exports.SnippetEntity = SnippetEntity;
