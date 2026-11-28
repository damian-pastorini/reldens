/**
 *
 * Reldens - StatsUpdateHandler
 *
 * Handles broadcasting stat updates to team and clan members.
 * Triggers updates when player stats change to keep team/clan UI synchronized; the members on other servers get the
 * change through a queued servers update (one per group and update interval), never one request per stats change.
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { sc } = require('@reldens/utils');

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
        currentTeam.serversSync.queueUpdate(currentTeam, currentTeamId);
        return TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    static async updateClan(props)
    {
        let clan = props.teamsPlugin.fetchPlayerClan(props.playerSchema);
        if(!clan){
            return false;
        }
        clan.serversSync.queueUpdate(clan, clan.id);
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

}

module.exports.StatsUpdateHandler = StatsUpdateHandler;
