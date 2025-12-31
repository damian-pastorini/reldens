/**
 *
 * Reldens - TryTeamStart
 *
 * Handles team invitation requests from players.
 * Validates the invitation and sends team invite message to the target player.
 *
 */

const { TeamsConst } = require('../../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../../rooms/server/state').PlayerState} PlayerState
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../plugin').TeamsPlugin} TeamsPlugin
 */
class TryTeamStart
{

    /**
     * @param {Object} client
     * @param {Object} data
     * @param {RoomScene} room
     * @param {PlayerState} playerSchema
     * @param {TeamsPlugin} teamsPlugin
     * @returns {Promise<boolean>}
     */
    static async execute(client, data, room, playerSchema, teamsPlugin)
    {
        if(playerSchema.player_id === data.id){
            Logger.info('The player is trying to team up with himself.', playerSchema.player_id, data);
            return false;
        }
        let toPlayerClient = room.activePlayerByPlayerId(data.id, room.roomId)?.client;
        if(!toPlayerClient){
            Logger.error('Team invite player not found.', toPlayerClient, data);
            return false;
        }
        let sendData = {
            act: TeamsConst.ACTIONS.TEAM_INVITE,
            listener: TeamsConst.KEY,
            from: playerSchema.playerName,
            id: playerSchema.player_id,
        };
        let event = {client, data, room, playerSchema, teamsPlugin, continueStart: true};
        await teamsPlugin.events.emit('reldens.tryTeamStart', event);
        if(!event.continueStart){
            return false;
        }
        toPlayerClient.send('*', sendData);
        return true;
    }
}

module.exports.TryTeamStart = TryTeamStart;
