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

        let showPropertiesKeys = Object.keys(properties);
        let listPropertiesKeys = [...showPropertiesKeys];
        let editPropertiesKeys = [...showPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('id'), 1);
        listPropertiesKeys.splice(listPropertiesKeys.indexOf('code'), 1);
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

module.exports.FeaturesEntity = FeaturesEntity;
