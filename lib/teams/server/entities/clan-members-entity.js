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

module.exports.ClanMembersEntity = ClanMembersEntity;
