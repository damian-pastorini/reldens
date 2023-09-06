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

module.exports.AdsPlayedEntity = AdsPlayedEntity;
