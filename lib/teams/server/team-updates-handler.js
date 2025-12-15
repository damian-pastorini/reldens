/**
 *
 * Reldens - TeamUpdatesHandler
 *
 * Handles broadcasting team updates to all team members.
 * Sends player data updates and team status changes to connected clients.
 *
 */

const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('./team').Team} Team
 */
class TeamUpdatesHandler
{

    /**
     * @param {Team} team
     * @returns {boolean}
     */
    static updateTeamPlayers(team)
    {
        let clientsKeys = Object.keys(team.clients);
        if(0 === clientsKeys.length){
            return false;
        }
        let playersList = PlayersDataMapper.fetchPlayersData(team);
        if(0 === Object.keys(playersList).length){
            Logger.info('Team update without players.', team);
            return false;
        }
        for(let i of clientsKeys){
            let otherPlayersData = Object.assign({}, playersList);
            delete otherPlayersData[i];
            let sendUpdate = Object.assign(
                {},
                {
                    act: this.actionConstant(),
                    id: team.owner.player_id,
                    listener: this.listenerKey(),
                    players: otherPlayersData,
                    leaderName: team.owner.playerName,
                }
            );
            team.clients[i].send('*', sendUpdate);
        }
        return true;
    }

    /**
     * @returns {string}
     */
    static listenerKey()
    {
        return TeamsConst.KEY;
    }

    /**
     * @returns {string}
     */
    static actionConstant()
    {
        return TeamsConst.ACTIONS.TEAM_UPDATE;
    }

}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;
