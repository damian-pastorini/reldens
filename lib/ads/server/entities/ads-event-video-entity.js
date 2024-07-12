/**
 *
 * Reldens - AdsEventVideoEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AdsEventVideoEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'event_key';
        let properties = {
            id: {},
            ads_id: {
                type: 'reference',
                reference: 'ads',
                isRequired: true
            },
            [titleProperty]: {
                isRequired: true
            },
            event_data: {}
        };

        let showProperties = Object.keys(properties);
        let listProperties = [...showProperties];
        let editProperties = [...listProperties];
        listProperties.splice(listProperties.indexOf('event_data'), 1);
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

module.exports.AdsEventVideoEntity = AdsEventVideoEntity;
