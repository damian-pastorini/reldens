/**
 *
 * Reldens - ClanUpdatesHandler
 *
 */

const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');

class ClanUpdatesHandler
{

    static updateClanPlayers(clan)
    {
        // @TODO - BETA - Consider extend TeamUpdatesHandler.
        let clientsKeys = Object.keys(clan.clients);
        if (0 === clientsKeys.length) {
            return false;
        }
        let playersList = PlayersDataMapper.fetchPlayersData(clan);
        if(0 === Object.keys(playersList).length){
            return false;
        }
        for(let i of clientsKeys){
            let otherPlayersData = Object.assign({}, playersList);
            delete otherPlayersData[i];
            let sendUpdate = {
                act: TeamsConst.ACTIONS.CLAN_UPDATE,
                id: clan.ownerClient.id,
                listener: TeamsConst.CLAN_KEY,
                players: otherPlayersData,
                leaderName: clan.owner.playerName,
                clan: clan.toArray()
            };
            clan.clients[i].send('*', sendUpdate);
        }
        return true;
    }

}

module.exports.ClanUpdatesHandler = ClanUpdatesHandler;
