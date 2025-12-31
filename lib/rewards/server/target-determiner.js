/**
 *
 * Reldens - TargetDeterminer
 *
 * Determines reward distribution targets based on team membership, returning either a single player or all team members.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../teams/server/plugin').TeamsPlugin} TeamsPlugin
 */
class TargetDeterminer
{

    /**
     * @param {TeamsPlugin} teamsPlugin
     */
    constructor(teamsPlugin)
    {
        /** @type {TeamsPlugin} */
        this.teamsPlugin = teamsPlugin;
    }

    /**
     * @param {Object} playerSchema
     * @returns {Object<string, Object>}
     */
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
