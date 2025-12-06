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
            [
                'related_players',
                'related_clan_members.related_players',
                'related_clan_levels.related_clan_levels_modifiers'
            ]
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
