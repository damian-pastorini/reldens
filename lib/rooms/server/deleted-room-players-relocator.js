/**
 *
 * Reldens - DeletedRoomPlayersRelocator
 *
 * Handles the player states when rooms are deleted from the administration panel: the configured default
 * room can never be deleted, and the player states in any other deleted room are only moved to the default room
 * when "rooms/deletion/setDefault" is enabled. With it disabled nothing is touched here and the room foreign key
 * sets those player states to null.
 *
 * The default room id comes from the configuration manager, which the administration panel keeps up to date on the
 * running server when a new default room is saved.
 *
 */

const { RoomsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDataServer} BaseDataServer
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class DeletedRoomPlayersRelocator
{

    /**
     * @param {BaseDataServer} dataServer
     * @param {ConfigManager} config
     */
    constructor(dataServer, config)
    {
        /** @type {BaseDataServer} */
        this.dataServer = dataServer;
        /** @type {ConfigManager} */
        this.config = config;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async prevent(event)
    {
        let control = sc.get(event, 'deleteControl', false);
        let roomIds = sc.get(event, 'ids', []);
        if(!control || !sc.isNotEmptyArray(roomIds)){
            return false;
        }
        let defaultRoomId = String(this.config?.getWithoutLogs('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, ''));
        if(-1 !== roomIds.indexOf(defaultRoomId)){
            control.prevented = true;
            control.result = 'errorRoomDeleteIsDefault';
            return true;
        }
        if(!this.config?.getWithoutLogs('server/rooms/deletion/setDefault', true)){
            return false;
        }
        if(!defaultRoomId){
            Logger.warning('None default room configured, deleted rooms player states will be unlinked.', roomIds);
            return false;
        }
        await this.relocatePlayerStates(roomIds, defaultRoomId);
        return false;
    }

    /**
     * @param {Array<string|number>} roomIds
     * @param {number|string} defaultRoomId
     * @returns {Promise<boolean>}
     */
    async relocatePlayerStates(roomIds, defaultRoomId)
    {
        let playersStateRepository = this.dataServer.getEntity('playersState');
        if(!playersStateRepository){
            Logger.error('PlayersState repository not found on DeletedRoomPlayersRelocator.');
            return false;
        }
        for(let roomId of roomIds){
            await playersStateRepository.updateBy('room_id', Number(roomId), {room_id: defaultRoomId});
        }
        return true;
    }

}

module.exports.DeletedRoomPlayersRelocator = DeletedRoomPlayersRelocator;
