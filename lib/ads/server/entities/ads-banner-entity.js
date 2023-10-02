/**
 *
 * Reldens - AdsBannerEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AdsBannerEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            ads_id: {
                type: 'reference',
                reference: 'ads',
                isRequired: true
            },
            banner_data: {}
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

module.exports.AdsBannerEntity = AdsBannerEntity;
