/**
 *
 * Reldens - ClanUpdatesHandler
 *
 * Handles broadcasting clan updates to all clan members.
 * Sends player data updates and clan status changes to connected clients.
 *
 */

const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('./clan').Clan} Clan
 */
class ClanUpdatesHandler
{

    /**
     * @param {Clan} clan
     * @returns {boolean}
     */
    static updateClanPlayers(clan)
    {
        // @TODO - BETA - Consider extend TeamUpdatesHandler.
        let clientsKeys = Object.keys(clan.clients);
        if(0 === clientsKeys.length){
            // expected if clan members are not logged in and by that there will not be any clients available:
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
                {},
                {
                    act: this.actionConstant(),
                    listener: this.listenerKey(),
                    players: otherPlayersData,
                },
                clan.mapForClient()
            );
            clan.clients[i].send('*', sendUpdate);
        }
        return true;
    }

    /**
     * @returns {string}
     */
    static listenerKey()
    {
        return TeamsConst.CLAN_KEY;
    }

    /**
     * @returns {string}
     */
    static actionConstant()
    {
        return TeamsConst.ACTIONS.CLAN_UPDATE;
    }

}

module.exports.ClanUpdatesHandler = ClanUpdatesHandler;
