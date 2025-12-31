/**
 *
 * Reldens - ClanFactory
 *
 * Factory class for creating and initializing Clan instances from database models.
 * Handles clan model loading, clan object creation, and plugin registration.
 *
 */

const { Clan } = require('./clan');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('./plugin').TeamsPlugin} TeamsPlugin
 */
class ClanFactory
{

    /**
     * @param {number|string} clanId
     * @param {PlayerState} playerOwner
     * @param {Object} clientOwner
     * @param {Object} sharedProperties
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<Clan|boolean>}
     */
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
