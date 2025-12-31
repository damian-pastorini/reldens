/**
 *
 * Reldens - AdsEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class AdsEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let titleProperty = 'key';
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            [titleProperty]: {
                isRequired: true,
                dbType: 'varchar'
            },
            provider_id: {
                type: 'reference',
                reference: 'ads_providers',
                isRequired: true,
                dbType: 'int'
            },
            type_id: {
                type: 'reference',
                reference: 'ads_types',
                isRequired: true,
                dbType: 'int'
            },
            width: {
                type: 'number',
                dbType: 'int'
            },
            height: {
                type: 'number',
                dbType: 'int'
            },
            position: {
                dbType: 'varchar'
            },
            top: {
                type: 'number',
                dbType: 'int'
            },
            bottom: {
                type: 'number',
                dbType: 'int'
            },
            left: {
                type: 'number',
                dbType: 'int'
            },
            right: {
                type: 'number',
                dbType: 'int'
            },
            replay: {
                type: 'number',
                dbType: 'int'
            },
            enabled: {
                type: 'boolean',
                dbType: 'tinyint'
            },
            created_at: {
                type: 'datetime',
                dbType: 'timestamp'
            },
            updated_at: {
                type: 'datetime',
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = sc.removeFromArray([...propertiesKeys], ['id', 'created_at', 'updated_at']);
        let listProperties = propertiesKeys;
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

module.exports.AdsEntity = AdsEntity;
