/**
 *
 * Reldens - ActivePlayersData
 *
 */

class ActivePlayersData
{

    constructor()
    {
        this.playersById = {};
        this.playersByRoomAndId = {};
    }

}

module.exports.PlayersData = new ActivePlayersData();
