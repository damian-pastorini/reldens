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
                act: TeamsConst.ACTIONS.TEAM_UPDATE,
                id: team.ownerClient.id,
                listener: TeamsConst.KEY,
                players: otherPlayersData,
                leaderName: team.owner.playerName,
            };
            team.clients[i].send('*', sendUpdate);
        }
        return true;
    }

}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;
