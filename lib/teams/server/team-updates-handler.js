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

    static fetchPlayerProperties(player, sharedProperties)
    {
        let playerProperties = {};
        for(let propertyName of sharedProperties){
            let propertyPath = propertyName.split('/');
            playerProperties[propertyPath[propertyPath.length]] = sc.get(propertyPath, player);
        }
        return playerProperties;
    }

    static teamBroadcast(team, sendData)
    {
        for(let i of Object.keys(team.players)){
            let player = team.players[i];
            player.client.send('*', sendData);
        }
    }


}

module.exports.TeamUpdatesHandler = TeamUpdatesHandler;