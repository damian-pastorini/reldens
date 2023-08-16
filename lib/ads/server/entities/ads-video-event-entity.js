/**
 *
 * Reldens - AdsVideoEventEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AdsVideoEventEntity extends EntityProperties
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
            event_key: {
                isRequired: true
            },
            event_data: {}
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);
        listPropertiesKeys.splice(listPropertiesKeys.indexOf('event_data'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.AdsVideoEventEntity = AdsVideoEventEntity;
