/**
 *
 * Reldens - ClanMembersEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ClanMembersEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            clan_id: {
                type: 'reference',
                reference: 'clan',
                isRequired: true
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
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

module.exports.ClanMembersEntity = ClanMembersEntity;
