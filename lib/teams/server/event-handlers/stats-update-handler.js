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
        let clan = props.teamsPlugin.fetchPlayerClan(props.playerSchema);
        if(!clan){
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

}

module.exports.StatsUpdateHandler = StatsUpdateHandler;
