/**
 *
 * Reldens - AdsPlayedEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class AdsPlayedEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            ads_id: {
                type: 'reference',
                reference: 'ads',
                alias: 'related_ads',
                isRequired: true,
                dbType: 'int'
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                alias: 'related_players',
                isRequired: true,
                dbType: 'int'
            },
            started_at: {
                type: 'datetime',
                dbType: 'datetime'
            },
            ended_at: {
                type: 'datetime',
                dbType: 'datetime'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
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

module.exports.AdsPlayedEntity = AdsPlayedEntity;
