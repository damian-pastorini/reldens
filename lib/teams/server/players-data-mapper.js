/**
 *
 * Reldens - PlayersDataMapper
 *
 * Maps player data for team and clan updates.
 * Extracts and formats player information including shared properties for client transmission.
 *
 */

const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('./team').Team} Team
 * @typedef {import('./clan').Clan} Clan
 */
class PlayersDataMapper
{

    /**
     * @param {Team|Clan} team
     * @returns {Object}
     */
    static fetchPlayersData(team)
    {
        let teamPlayersId = Object.keys(team.players);
        let playersData = {};
        for(let i of teamPlayersId){
            playersData[i] = this.fetchPlayerData(team.players[i], team.sharedProperties);
        }
        for(let i of Object.keys(team.remotePlayers)){
            playersData[i] = team.remotePlayers[i].data;
        }
        return playersData;
    }

    /**
     * @param {PlayerState} playerSchema
     * @param {Object} sharedProperties
     * @returns {Object}
     */
    static fetchPlayerData(playerSchema, sharedProperties)
    {
        return {
            name: playerSchema.playerName,
            player_id: playerSchema.player_id,
            sessionId: playerSchema.sessionId,
            sharedProperties: this.mapSharedProperties(playerSchema, sharedProperties, false)
        };
    }

    /**
     * @param {number|string} playerId
     * @param {Object|boolean} data
     * @param {Object} sharedProperties
     * @returns {Object|boolean}
     */
    static mapReceivedPlayerData(playerId, data, sharedProperties)
    {
        if(!sc.isObject(data) || !sc.isString(data.name) || String(data.player_id) !== String(playerId)){
            return false;
        }
        return {
            name: data.name.substring(0, TeamsConst.PLAYER_NAME_LIMIT),
            player_id: data.player_id,
            sessionId: String(sc.get(data, 'sessionId', '')),
            sharedProperties: this.mapSharedProperties(data, sharedProperties, true)
        };
    }

    /**
     * @param {PlayerState|Object} source
     * @param {Object} sharedProperties
     * @param {boolean} isReceivedData
     * @returns {Object}
     */
    static mapSharedProperties(source, sharedProperties, isReceivedData)
    {
        let mappedProperties = {};
        for(let i of Object.keys(sharedProperties)){
            let propertyData = sharedProperties[i];
            let value = sc.getByPath(
                source,
                isReceivedData ? ['sharedProperties', i, 'value'] : propertyData.path.split('/'),
                0
            );
            mappedProperties[i] = {label: propertyData.label, value: sc.isNumber(value) ? value : 0};
            let pathMax = sc.get(propertyData, 'pathMax', '');
            if('' === pathMax){
                continue;
            }
            let max = sc.getByPath(source, isReceivedData ? ['sharedProperties', i, 'max'] : pathMax.split('/'), 0);
            mappedProperties[i].max = sc.isNumber(max) ? max : 0;
        }
        return mappedProperties;
    }

}

module.exports.PlayersDataMapper = PlayersDataMapper;
