/**
 *
 * Reldens - ClanFactory
 *
 * Factory class for creating and initializing Clan instances from database models.
 * Handles clan model loading, clan object creation, and plugin registration.
 *
 */

const { Clan } = require('./clan');
const { Modifier } = require('@reldens/modifiers');
const { Logger, sc } = require('@reldens/utils');

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
            sharedProperties,
            modifiers: this.mapModifiersFromLevelModel(clanModel.related_clan_levels)
        });
        newClan.join(playerOwner, clientOwner, newClan.members[playerOwner.player_id]);
        teamsPlugin.clans[clanId] = newClan;
        return teamsPlugin.clans[clanId];
    }

    /**
     * @param {Object} levelModel
     * @returns {Object<number, Modifier>}
     */
    static mapModifiersFromLevelModel(levelModel)
    {
        let modifiersModels = sc.get(levelModel, 'related_clan_levels_modifiers', []);
        if(!sc.isArray(modifiersModels)){
            return {};
        }
        if(0 === modifiersModels.length){
            return {};
        }
        let modifiers = {};
        for(let modifierData of modifiersModels){
            modifiers[modifierData.id] = new Modifier(modifierData);
        }
        return modifiers;
    }

}

module.exports.ClanFactory = ClanFactory;
