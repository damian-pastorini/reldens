/**
 *
 * Reldens - TargetDeterminer
 *
 */

const { Logger, sc } = require('@reldens/utils');

class TargetDeterminer
{

    constructor(teamsPlugin)
    {
        this.teamsPlugin = teamsPlugin;
    }

    forReward(playerSchema)
    {
        let singleTarget = {[playerSchema.player_id]: playerSchema};
        if(!playerSchema.currentTeam){
            return singleTarget;
        }
        if(!this.teamsPlugin){
            Logger.error('TeamsPlugin undefined on RewardsSubscriber.');
            return singleTarget;
        }
        let playerTeam = sc.get(this.teamsPlugin.teams, playerSchema.currentTeam, false);
        if(!playerTeam){
            Logger.error('Defined team ID on player not found.', {
                currentTeam: playerSchema.currentTeam,
                playerId: playerSchema.player_id,
                teamsPlugin: this.teamsPlugin
            });
            return singleTarget;
        }
        return 1 < Object.keys(playerTeam.players).length ? playerTeam.players : singleTarget;
    }

}

module.exports.TargetDeterminer = TargetDeterminer;
