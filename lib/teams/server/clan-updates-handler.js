/**
 *
 * Reldens - ClanUpdatesHandler
 *
 */

const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');
const {Logger} = require("@reldens/utils");

class ClanUpdatesHandler
{

    static updateClanPlayers(clan)
    {
        // @TODO - BETA - Consider extend TeamUpdatesHandler.
        let clientsKeys = Object.keys(clan.clients);
        if (0 === clientsKeys.length) {
            Logger.info('Clan update without clients.', clan);
            return false;
        }
        let playersList = PlayersDataMapper.fetchPlayersData(clan);
        if(0 === Object.keys(playersList).length){
            Logger.info('Clan update without players.', clan);
            return false;
        }
        for(let i of clientsKeys){
            let otherPlayersData = Object.assign({}, playersList);
            delete otherPlayersData[i];
            let sendUpdate = Object.assign(
                {
                    act: TeamsConst.ACTIONS.CLAN_UPDATE,
                    listener: TeamsConst.CLAN_KEY,
                    players: otherPlayersData,
                },
                clan.toArray()
            );
            clan.clients[i].send('*', sendUpdate);
        }
        return true;
    }

}

module.exports.ClanUpdatesHandler = ClanUpdatesHandler;
