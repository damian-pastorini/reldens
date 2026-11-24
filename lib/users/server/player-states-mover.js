/**
 *
 * Reldens - PlayerStatesMover
 *
 * Moves the stored player states of the rooms deleted from the administration panel, so only the users module reads and
 * writes the players state entity: on "reldens.prepareDeletedRoomsPlayersRelocation" (before the delete, since the room
 * foreign key unlinks the states) it keeps the ids of the player states in the deleted rooms on the delete control, and
 * on "reldens.relocateDeletedRoomsPlayers" (after a successful delete) it moves them to the given default room. A
 * storage error is logged and answered as nothing loaded or nothing moved.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 *
 * @typedef {Object} PlayerStatesMoverProps
 * @property {EventsManager|boolean} events
 * @property {BaseDriver|boolean} playerStateRepository
 */
class PlayerStatesMover
{

    /**
     * @param {PlayerStatesMoverProps} props
     */
    constructor(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = props.events;
        /** @type {BaseDriver|boolean} */
        this.playerStateRepository = props.playerStateRepository;
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events || !this.playerStateRepository){
            Logger.error('PlayerStatesMover requires the events manager and the players state repository.');
            return false;
        }
        this.events.on('reldens.prepareDeletedRoomsPlayersRelocation', async (event) => {
            event.deleteControl.relocatedPlayerStatesIds = await this.loadIdsInRooms(event.roomIds);
        });
        this.events.on('reldens.relocateDeletedRoomsPlayers', async (event) => {
            await this.moveToRoom(sc.get(event.deleteControl, 'relocatedPlayerStatesIds', []), event.defaultRoomId);
        });
        return true;
    }

    /**
     * @param {Array<number>} roomIds
     * @returns {Promise<Array<number>>}
     */
    async loadIdsInRooms(roomIds)
    {
        let playerStatesIds = [];
        try {
            let playerStates = await this.playerStateRepository.load({room_id: {operator: 'IN', value: roomIds}});
            for(let playerState of playerStates){
                playerStatesIds.push(playerState.id);
            }
        } catch (error) {
            Logger.error('Player states load error for the rooms.', roomIds, error.message);
        }
        return playerStatesIds;
    }

    /**
     * @param {Array<number>} playerStatesIds
     * @param {number|string} roomId
     * @returns {Promise<boolean>}
     */
    async moveToRoom(playerStatesIds, roomId)
    {
        if(!sc.isNotEmptyArray(playerStatesIds)){
            return false;
        }
        try {
            await this.playerStateRepository.update({id: {operator: 'IN', value: playerStatesIds}}, {room_id: roomId});
            return true;
        } catch (error) {
            Logger.error('Player states move error.', playerStatesIds, roomId, error.message);
        }
        return false;
    }

}

module.exports.PlayerStatesMover = PlayerStatesMover;
