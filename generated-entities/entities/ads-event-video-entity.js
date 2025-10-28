/**
 *
 * Reldens - AdsEventVideoEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class AdsEventVideoEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                dbType: 'int'
            },
            ads_id: {
                type: 'reference',
                reference: 'ads',
                isRequired: true,
                dbType: 'int'
            },
            event_key: {
                isRequired: true,
                dbType: 'varchar'
            },
            event_data: {
                type: 'textarea',
                isRequired: true,
                dbType: 'text'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = [...propertiesKeys];
        listProperties.splice(listProperties.indexOf('event_data'), 1);
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

module.exports.AdsEventVideoEntity = AdsEventVideoEntity;
