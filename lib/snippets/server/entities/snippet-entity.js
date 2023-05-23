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

module.exports.SnippetEntity = SnippetEntity;
