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
        return this.updatePlayers(team, TeamsConst.ACTIONS.TEAM_UPDATE, TeamsConst.KEY);
    }

    static updateClanPlayers(clan)
    {
        return this.updatePlayers(clan, TeamsConst.ACTIONS.CLAN_UPDATE, TeamsConst.CLAN_KEY);
    }

    static updatePlayers(team, act, listener)
    {
        let clientsKeys = Object.keys(team.clients);
        if (0 === clientsKeys.length) {
            return false;
        }
        let playersList = PlayersDataMapper.fetchPlayersData(team);
        if (0 === Object.keys(playersList).length) {
            return false;
        }
        for (let i of clientsKeys) {
            let otherPlayersData = Object.assign({}, playersList);
            delete otherPlayersData[i];
            let sendUpdate = {
                act,
                id: team.ownerClient.id,
                listener,
                players: otherPlayersData,
                leaderName: team.owner.playerName,
            };
            team.clients[i].send('*', sendUpdate);
        }
        return true;
    }
}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;
