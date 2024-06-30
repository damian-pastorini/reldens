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

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);
        listPropertiesKeys.splice(listPropertiesKeys.indexOf('event_data'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            titleProperty,
            ...extraProps
        };
    }

}

module.exports.AdsEventVideoEntity = AdsEventVideoEntity;
