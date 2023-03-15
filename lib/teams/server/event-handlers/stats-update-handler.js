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
        let {teamsPlugin, playerSchema} = props;
        let currentTeamId = sc.get(playerSchema, 'currentTeam', '');
        if('' === currentTeamId){
            return;
        }
        let currentTeam = sc.get(teamsPlugin.teams, currentTeamId, false);
        if(!currentTeam){
            Logger.error('Team not found: '+ currentTeamId);
            return;
        }
        return TeamUpdatesHandler.updateTeamPlayers(currentTeam);
    }

    static async updateClan(props)
    {
        let {teamsPlugin, playerSchema} = props;
        let clanId = sc.get(playerSchema.privateData.clan, 'id', '');
        if('' === clanId){
            return;
        }
        let currentClan = sc.get(teamsPlugin.clans, clanId, false);
        if(!currentClan){
            Logger.error('Clan not found: '+ clanId);
            return;
        }
        return ClanUpdatesHandler.updateClanPlayers(currentClan);
    }

}

module.exports.StatsUpdateHandler = StatsUpdateHandler;
