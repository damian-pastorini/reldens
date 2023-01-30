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
            playersData[i] = this.fetchPlayerProperties(team.players[i], team.sharedProperties);
        }
        return playersData;
    }

    static fetchPlayerProperties(playerSchema, sharedProperties)
    {
        let playerProperties = {};
        for(let i of Object.keys(sharedProperties)){
            let propertyData = sharedProperties[i];
            playerProperties[i] = {
                label: propertyData.label,
                value: sc.getByPath(playerSchema, propertyData.path.split('/'), 0),
            };
            if(propertyData.useMax){
                playerProperties[i].max = sc.getByPath(playerSchema, propertyData.useMax.split('/'), 0);
            }
        }
        return playerProperties;
    }

}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;
