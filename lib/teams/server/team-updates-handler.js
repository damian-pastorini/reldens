/**
 *
 * Reldens - TeamUpdatesHandler
 *
 */

const { PlayersDataMapper } = require('./players-data-mapper');
const { TeamsConst } = require('../constants');

class TeamUpdatesHandler
{

    static updateTeamPlayers(team)
    {
        let clientsKeys = Object.keys(team.clients);
        if (0 === clientsKeys.length) {
            return false;
        }
        let playersList = PlayersDataMapper.fetchPlayersData(team);
        if (0 === Object.keys(playersList).length) {
            return false;
        }
        for(let i of clientsKeys){
            let otherPlayersData = Object.assign({}, playersList);
            delete otherPlayersData[i];
            let sendUpdate = {
                act: this.actionConstant(),
                id: team.ownerClient.id,
                listener: this.listenerKey(),
                players: otherPlayersData,
                leaderName: team.owner.playerName,
            };
            team.clients[i].send('*', sendUpdate);
        }
        return true;
    }

    static listenerKey()
    {
        return TeamsConst.KEY;
    }

    static actionConstant()
    {
        return TeamsConst.ACTIONS.TEAM_UPDATE;
    }

}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;
