/**
 *
 * Reldens - StatsUpdateHandler
 *
 * Handles broadcasting stat updates to team and clan members.
 * Triggers updates when player stats change to keep team/clan UI synchronized.
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../clan').Clan} Clan
 */
class StatsUpdateHandler
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async updateTeam(props)
    {
        let currentTeamId = sc.get(props.playerSchema, 'currentTeam', '');
        if('' === currentTeamId){
            return false;
        }
        let currentTeam = sc.get(props.teamsPlugin.teams, currentTeamId, false);
        if(!currentTeam){
            // expected, team not found
            return false;
        }
        return TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async updateClan(props)
    {
        let clan = this.fetchPlayerClan(props.playerSchema, props.teamsPlugin.clans);
        if(!clan){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

    /**
     * @param {Object} playerSchema
     * @param {Object} objectState
     * @param {Object<string, Clan>} clans
     * @returns {boolean}
     */
    static revertClanModifiersOnSave(playerSchema, objectState, clans)
    {
        let clan = this.fetchPlayerClan(playerSchema, clans);
        if(!clan){
            return false;
        }
        if(!sc.hasOwn(clan.players, playerSchema.player_id)){
            return false;
        }
        return clan.revertModifiersOnSavedStats(objectState);
    }

    /**
     * @param {Object} playerSchema
     * @param {Object<string, Clan>} clans
     * @returns {Clan|boolean}
     */
    static fetchPlayerClan(playerSchema, clans)
    {
        let clanId = playerSchema?.privateData?.clan;
        if(!clanId){
            return false;
        }
        //Logger.debug('Expected, Clan not found: '+clanId);
        return sc.get(clans, clanId, false);
    }

}

module.exports.StatsUpdateHandler = StatsUpdateHandler;
