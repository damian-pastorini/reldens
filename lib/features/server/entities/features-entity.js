/**
 *
 * Reldens - FeaturesEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class FeaturesEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'title';
        let properties = {
            id: {},
            code: {
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            is_enabled: {
                type: 'boolean',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...showProperties];
        listProperties.splice(listProperties.indexOf('code'), 1);
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.FeaturesEntity = FeaturesEntity;
