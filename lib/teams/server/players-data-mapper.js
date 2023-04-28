/**
 *
 * Reldens - PlayersDataMapper
 *
 */

const { sc } = require('@reldens/utils');

class PlayersDataMapper
{

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
            player_id: playerSchema.player_id,
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

module.exports.PlayersDataMapper = PlayersDataMapper;
