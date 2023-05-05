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
        // @TODO - BETA - Refactor fromModel and join methods to use a single one.
        let newClan = Clan.fromModel({
            clanModel,
            clientOwner,
            sharedProperties
        });
        newClan.join(playerOwner, clientOwner, newClan.members[playerOwner.player_id]);
        teamsPlugin.clans[clanId] = newClan;
        return teamsPlugin.clans[clanId];
    }

}

module.exports.ClanFactory = ClanFactory;
