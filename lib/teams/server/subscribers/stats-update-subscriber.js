/**
 *
 * Reldens - StatsUpdateSubscriber
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');
const { Logger, sc } = require('@reldens/utils');

class StatsUpdateSubscriber
{
    
    static async updateTeamData(props)
    {
        let {teamsPlugin, playerSchema} = props;
        let currentTeamId = sc.get(playerSchema, 'currentTeam', '');
        if('' === currentTeamId){
            Logger.info('Team ID not present.', currentTeamId, playerSchema.currentTeam);
            return;
        }
        let currentTeam = sc.get(teamsPlugin.teams, currentTeamId, false);
        if(!currentTeam){
            Logger.error('Team not found: '+ currentTeamId);
            return;
        }
        return TeamUpdatesHandler.updateTeamPlayers(teamsPlugin.teams[playerSchema.currentTeam]);
    }

}

module.exports.StatsUpdateSubscriber = StatsUpdateSubscriber;
