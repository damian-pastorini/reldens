/**
 *
 * Reldens - DeletedRoomsCrossServerClose
 *
 * Sends the rooms deleted on this server to the other servers, and closes the deleted rooms received from them.
 *
 */

const { SignedServerToServerMessenger } = require('../../game/server/signed-server-to-server-messenger');
const { RoomsConst } = require('../constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./deleted-room-closer').DeletedRoomCloser} DeletedRoomCloser
 * @typedef {import('../../game/server/signed-server-to-server-messenger').SignedServerToServerMessengerProps} MessengerProps
 *
 * @typedef {Object} DeletedRoomsCrossServerCloseProps
 * @property {DeletedRoomCloser} deletedRoomCloser
 */
class DeletedRoomsCrossServerClose extends SignedServerToServerMessenger
{

    /**
     * @param {MessengerProps & DeletedRoomsCrossServerCloseProps} props
     */
    constructor(props)
    {
        super(props);
        /** @type {DeletedRoomCloser} */
        this.deletedRoomCloser = props.deletedRoomCloser;
    }

    /**
     * @param {Array<number|string>} roomIds
     * @returns {Promise<Array<{serverUrl: string, response: Object|boolean}>>}
     */
    async sendDeletedRooms(roomIds)
    {
        return await this.sendToServers(
            this.otherServersUrls,
            RoomsConst.SYNC.CLOSE_DELETED_ROOMS,
            RoomsConst.SYNC.DELETED_ROOMS_TARGET,
            {roomIds}
        );
    }

    /**
     * @param {string} action
     * @param {string} targetId
     * @param {Object} payload
     * @returns {Promise<{isSuccess: boolean}>}
     */
    async receiveAction(action, targetId, payload)
    {
        return {
            isSuccess: RoomsConst.SYNC.CLOSE_DELETED_ROOMS === action
                && await this.deletedRoomCloser.closeRooms(sc.get(payload, 'roomIds', []))
        };
    }

}

module.exports.DeletedRoomsCrossServerClose = DeletedRoomsCrossServerClose;
