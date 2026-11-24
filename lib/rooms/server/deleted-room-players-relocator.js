/**
 *
 * Reldens - DeletedRoomPlayersRelocator
 *
 * Handles the player states when rooms are deleted from the administration panel: the configured default room can
 * never be deleted, and with "rooms/deletion/setDefault" enabled the player states of the deleted rooms are moved to the
 * default room once the delete succeeded (otherwise the room foreign key sets their room to null). The rooms module
 * never touches the player states: it emits "reldens.prepareDeletedRoomsPlayersRelocation" before the delete and
 * "reldens.relocateDeletedRoomsPlayers" after a successful one, and the users module (PlayerStatesMover) moves them.
 *
 * The default room id comes from the configuration manager, which the administration panel keeps up to date on the
 * running server when a new default room is saved.
 *
 */

const { RoomsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class DeletedRoomPlayersRelocator
{

    /**
     * @param {EventsManager} events
     * @param {ConfigManager} config
     */
    constructor(events, config)
    {
        /** @type {EventsManager} */
        this.events = events;
        /** @type {ConfigManager} */
        this.config = config;
        /** @type {boolean} */
        this.setDefault = config.getWithoutLogs('server/rooms/deletion/setDefault', true);
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
        let defaultRoomId = String(this.config.getWithoutLogs('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, ''));
        if(-1 !== roomIds.indexOf(defaultRoomId)){
            control.prevented = true;
            control.result = 'errorRoomDeleteIsDefault';
            return true;
        }
        if(!this.setDefault){
            return false;
        }
        if(!defaultRoomId){
            Logger.warning('None default room configured, deleted rooms player states will be unlinked.', roomIds);
            return false;
        }
        control.defaultRoomId = defaultRoomId;
        await this.events.emit('reldens.prepareDeletedRoomsPlayersRelocation', {
            roomIds: roomIds.map((roomId) => Number(roomId)),
            defaultRoomId,
            deleteControl: control
        });
        return false;
    }

    /**
     * @param {Object} event
     * @returns {Promise<boolean>}
     */
    async relocateAfterDelete(event)
    {
        let control = sc.get(event, 'deleteControl', false);
        if(!sc.get(control, 'defaultRoomId', false)){
            return false;
        }
        await this.events.emit('reldens.relocateDeletedRoomsPlayers', {
            defaultRoomId: control.defaultRoomId,
            deleteControl: control
        });
        return true;
    }

}

module.exports.DeletedRoomPlayersRelocator = DeletedRoomPlayersRelocator;
