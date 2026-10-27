/**
 *
 * Reldens - Theme - SkinAdMessagesListener
 *
 * Listens the scene room messages and fires the skin ad event when the server accepts the skin ticket use, the ads
 * providers play the ad video bound to that event key ("reldens.skinAdTicket" in the ads_event_video table).
 *
 */

const { UsersConst } = require('reldens/lib/users/constants');

class SkinAdMessagesListener
{

    /**
     * @param {Object} props
     * @param {Object} props.events
     */
    constructor(props)
    {
        /** @type {Object} */
        this.events = props.events;
    }

    /**
     * @param {Object} room
     * @returns {boolean}
     */
    listenRoomMessages(room)
    {
        room.onMessage('*', async (message) => {
            await this.onRoomMessage(message);
        });
        return true;
    }

    /**
     * @param {Object} message
     * @returns {Promise<boolean>}
     */
    async onRoomMessage(message)
    {
        if(UsersConst.SKINS.ACTIONS.AD_START !== message?.act){
            return false;
        }
        await this.events.emit(UsersConst.SKINS.EVENTS.AD_REQUESTED, message);
        return true;
    }

}

module.exports.SkinAdMessagesListener = SkinAdMessagesListener;
