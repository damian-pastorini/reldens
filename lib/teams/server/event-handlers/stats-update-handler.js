/**
 *
 * Reldens - StatsUpdateHandler
 *
 */

const { ClanUpdatesHandler } = require('../clan-updates-handler');
const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger, sc } = require('@reldens/utils');


class StatsUpdateHandler
{

    static async updateTeam(props)
    {
        let currentTeamId = sc.get(props.playerSchema, 'currentTeam', '');
        if('' === currentTeamId){
            return false;
        }
        let currentTeam = sc.get(props.teamsPlugin.teams, currentTeamId, false);
        if(!currentTeam){
            Logger.debug('Expected, Team not found: '+ currentTeamId);
            return false;
        }
        return TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

    static async updateClan(props)
    {
        let clanId = props.playerSchema?.privateData?.clan;
        if(!clanId){
            return false;
        }
        let clan = sc.get(props.teamsPlugin.clans, clanId, false);
        if(!clan){
            Logger.debug('Expected, Clan not found: '+ clanId);
            return false;
        }
        return ClanUpdatesHandler.updateClanPlayers(clan);
    }

}

module.exports.StatsUpdateHandler = StatsUpdateHandler;
