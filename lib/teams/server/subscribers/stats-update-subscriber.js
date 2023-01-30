/**
 *
 * Reldens - StatsUpdateSubscriber
 *
 */

const { TeamUpdatesHandler } = require('../team-updates-handler');

class StatsUpdateSubscriber
{
    
    static async updateTeamData(props)
    {
        let {teamsPlugin, playerSchema} = props;
        return TeamUpdatesHandler.updateTeamPlayers(
            teamsPlugin.teams[playerSchema.currentTeam]?.leave(playerSchema)
        );
    }

}

module.exports.StatsUpdateSubscriber = StatsUpdateSubscriber;
