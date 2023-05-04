/**
 *
 * Reldens - ClanFactory
 *
 */

const { Clan } = require('./clan');
const { Logger } = require('@reldens/utils');

class ClanFactory
{

    static async create(clanId, playerOwner, clientOwner, sharedProperties, teamsPlugin)
    {
        // @TODO - BETA - Refactor to extract the teamsPlugin.
        let clanModel = await teamsPlugin.dataServer.getEntity('clan').loadByIdWithRelations(
            clanId,
            ['player_owner', 'members.parent_player, parent_level.modifiers']
        );
        if(!clanModel){
            Logger.error('Clan not found by ID "'+clanId+'".');
            return false;
        }
        teamsPlugin.clans[clanId] = Clan.fromModel({
            clanModel,
            sharedProperties
        });
        teamsPlugin.clans[clanId].join(playerOwner, clientOwner, clanModel.player_owner);
        return teamsPlugin.clans[clanId];
    }

}

module.exports.ClanFactory = ClanFactory;
