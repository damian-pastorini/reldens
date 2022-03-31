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
        let properties = {
            id: {},
            code: {
                isRequired: true
            },
            title: {
                isTitle: true,
                isRequired: true
            },
            is_enabled: {
                type: 'boolean',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        listPropertiesKeys.splice(listPropertiesKeys.indexOf('id'), 1);
        listPropertiesKeys.splice(listPropertiesKeys.indexOf('code'), 1);
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

module.exports.FeaturesEntity = FeaturesEntity;
