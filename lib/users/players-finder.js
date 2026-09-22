/**
 *
 * Reldens - PlayersFinder
 *
 * Shared lookup of a player model inside a players list, used by the server rooms and by the client users plugin.
 *
 */

const { sc } = require('@reldens/utils');

class PlayersFinder
{

    /**
     * @param {Array<Object>} players
     * @param {number} playerId
     * @returns {Object|boolean}
     */
    static fetchById(players, playerId)
    {
        if(!sc.isArray(players) || 0 === players.length){
            return false;
        }
        for(let player of players){
            if(player.id === playerId){
                return player;
            }
        }
        return false;
    }

}

module.exports.PlayersFinder = PlayersFinder;
