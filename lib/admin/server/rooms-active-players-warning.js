/**
 *
 * Reldens - RoomsActivePlayersWarning
 *
 * Renders the rooms view page banner with the currently logged players count in the room and the deletion
 * warning, injected at request time through the view extra content top placeholder. The count is also served
 * to the page scripts so the banner can refresh itself without a reload.
 *
 */

const { RoomsConst } = require('../../rooms/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/server/manager').RoomsManager} RoomsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class RoomsActivePlayersWarning
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {RoomsManager} */
        this.roomsManager = sc.get(props, 'roomsManager', false);
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {Function} */
        this.renderCallback = sc.get(props, 'renderCallback', false);
        /** @type {string} */
        this.templateContent = sc.get(props, 'templateContent', '');
        /** @type {number} */
        this.refreshMs = 5000;
        /** @type {number} */
        this.closeSeconds = Number(
            props.config.getWithoutLogs('server/rooms/deletion/closeActiveRoomsTime', 10000)
        ) / 1000;
        /** @type {boolean} */
        this.closeEnabled = Boolean(props.config.getWithoutLogs('server/rooms/deletion/closeActiveRoomsEnabled', true));
    }

    /**
     * @param {number|string} roomId
     * @returns {number}
     */
    countRoomPlayers(roomId)
    {
        let roomInstance = this.roomsManager.findRoomInstanceById(Number(roomId));
        if(!roomInstance){
            return 0;
        }
        return roomInstance.playersCountInState();
    }

    /**
     * @param {Object} renderedViewProperties
     * @returns {Promise<boolean>}
     */
    async appendTo(renderedViewProperties)
    {
        if(!this.templateContent){
            Logger.error('Rooms active players template was not loaded.');
            return false;
        }
        let roomId = Number(sc.get(renderedViewProperties, 'id', 0));
        let activePlayersCount = this.countRoomPlayers(roomId);
        let defaultRoomId = String(this.config.getWithoutLogs('server/'+RoomsConst.DEFAULT_ROOM_CONFIG_PATH, ''));
        let isDefaultRoom = '' !== defaultRoomId && String(roomId) === defaultRoomId;
        renderedViewProperties.extraContentForViewTop = await this.renderCallback(this.templateContent, {
            roomId,
            activePlayersCount,
            refreshMs: this.refreshMs,
            closeSeconds: this.closeSeconds,
            closeEnabled: this.closeEnabled,
            hasActivePlayers: 0 < activePlayersCount,
            isDefaultRoom,
            defaultRoomFlag: isDefaultRoom ? '1' : ''
        });
        return true;
    }

}

module.exports.RoomsActivePlayersWarning = RoomsActivePlayersWarning;
