/**
 *
 * Reldens - SnippetEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const {sc} = require("@reldens/utils");

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
            },
            created_at: {
                type: 'datetime',
            },
            updated_at: {
                type: 'datetime',
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties = sc.removeFromArray(editProperties, ['id', 'created_at', 'updated_at']);

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
