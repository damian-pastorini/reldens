/**
 *
 * Reldens - AdsPlayedEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class AdsPlayedEntity extends EntityProperties
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
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            }
        };

        let showProperties = Object.keys(properties);
        let editProperties = [...showProperties];
        editProperties.splice(editProperties.indexOf('id'), 1);

        return {
            showProperties,
            editProperties,
            listProperties: showProperties,
            filterProperties: showProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.AdsPlayedEntity = AdsPlayedEntity;
