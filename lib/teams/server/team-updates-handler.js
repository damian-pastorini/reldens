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
        let sendData = {act: TeamsConst.ACTIONS.TEAM_UPDATE};
        sendData.players = this.fetchPlayersData(team);
        // @TODO - HERE!
        // console.log(sendData);
        this.teamBroadcast(team, sendData);
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
        for(let propertyName of sharedProperties){
            let propertyPath = propertyName.split('/');
            // @TODO - HERE!
            // playerProperties[propertyPath[propertyPath.length]] = sc.get(propertyPath, playerSchema);
        }
        return playerProperties;
    }

    static teamBroadcast(team, sendData)
    {
        for(let i of Object.keys(team.clients)){
            // @TODO - HERE!
            // @TODO - BETA - Clone and remove current player from sendData.
            team.clients[i].send('*', sendData);
        }
    }


}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;