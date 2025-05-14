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
            banner_data: {
                isRequired: true
            }
        };
        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...showProperties];
        listProperties.splice(listProperties.indexOf('banner_data'), 1);
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.AdsBannerEntity = AdsBannerEntity;
