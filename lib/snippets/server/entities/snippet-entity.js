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

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.SnippetEntity = SnippetEntity;
