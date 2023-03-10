/**
 *
 * Reldens - ClanEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClanEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            owner_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            name: {
                isRequired: true
            },
            points: {
                type: 'number'
            },
            level: {}
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

module.exports.ClanEntity = ClanEntity;
