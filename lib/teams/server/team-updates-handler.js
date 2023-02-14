/**
 *
 * Reldens - TeamsMessageActions
 *
 */

const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class TeamUpdatesHandler
{

    static updateTeamPlayers(team)
    {
        let clientsKeys = Object.keys(team.clients);
        if(0 === clientsKeys.length){
            return false;
        }
        let playersList = this.fetchPlayersData(team);
        if(0 === Object.keys(playersList).length){
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

    static fetchPlayersData(team)
    {
        let teamPlayersId = Object.keys(team.players);
        let playersData = {};
        for(let i of teamPlayersId){
            playersData[i] = this.fetchPlayerData(team.players[i], team.sharedProperties);
        }
        return playersData;
    }

    static fetchPlayerData(playerSchema, sharedProperties)
    {
        let playerData = {
            name: playerSchema.playerName,
            id: playerSchema.player_id,
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

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;
