/**
 *
 * Reldens - PlayersDataMapper
 *
 * Maps player data for team and clan updates.
 * Extracts and formats player information including shared properties for client transmission.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('./team').Team} Team
 * @typedef {import('./clan').Clan} Clan
 */
class PlayersDataMapper
{

    /**
     * @param {Team|Clan} team
     * @returns {Object}
     */
    static fetchPlayersData(team)
    {
        let teamPlayersId = Object.keys(team.players);
        let playersData = {};
        for(let i of teamPlayersId){
            playersData[i] = this.fetchPlayerData(team.players[i], team.sharedProperties);
        }
        return playersData;
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {Object} sharedProperties
     * @returns {Object}
     */
    static fetchPlayerData(playerSchema, sharedProperties)
    {
        let playerData = {
            name: playerSchema.playerName,
            player_id: playerSchema.player_id,
            sessionId: playerSchema.sessionId,
            sharedProperties: {}
        };
        for(let i of Object.keys(sharedProperties)){
            let propertyData = sharedProperties[i];
            playerData.sharedProperties[i] = {
                label: propertyData.label,
                value: sc.getByPath(playerSchema, propertyData.path.split('/'), 0),
            };
            let pathMax = sc.get(propertyData, 'pathMax', '');
            if('' !== pathMax){
                playerData.sharedProperties[i].max = sc.getByPath(playerSchema, pathMax.split('/'), 0);
            }
        }
        return playerData;
    }

}

module.exports.PlayersDataMapper = PlayersDataMapper;
