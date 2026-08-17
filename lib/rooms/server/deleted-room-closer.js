/**
 *
 * Reldens - DeletedRoomCloser
 *
 * Removes a room deleted through the administration panel from the running server: purges the RoomsManager caches
 * and selector lists so the room ID stops resolving, notifies the connected players and disconnects the live room
 * instance after the configured time.
 *
 */

const { RoomsConst } = require('../constants');
const { MessageFactory } = require('../../chat/message-factory');
const { ChatConst } = require('../../chat/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./manager').RoomsManager} RoomsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 */
class DeletedRoomCloser
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {RoomsManager|boolean} */
        this.roomsManager = sc.get(props, 'roomsManager', false);
        if(!this.roomsManager){
            Logger.error('RoomsManager was not provided in DeletedRoomCloser.');
        }
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config was not provided in DeletedRoomCloser.');
        }
        /** @type {Object<number, Object>} */
        this.closeTimers = {};
        /** @type {boolean} */
        this.closeActiveRoomsEnabled = true;
        /** @type {number} */
        this.closeActiveRoomsTime = 10000;
        /** @type {number} */
        this.closeActiveRoomsWarningInterval = 5000;
        this.setupConfiguration();
    }

    /**
     * @returns {boolean}
     */
    setupConfiguration()
    {
        if(!this.config){
            return false;
        }
        this.closeActiveRoomsEnabled = Boolean(
            this.config.getWithoutLogs('server/rooms/deletion/closeActiveRoomsEnabled', true)
        );
        this.closeActiveRoomsTime = Number(
            this.config.getWithoutLogs('server/rooms/deletion/closeActiveRoomsTime', 10000)
        );
        this.closeActiveRoomsWarningInterval = Number(
            this.config.getWithoutLogs('server/rooms/deletion/closeActiveRoomsWarningInterval', 5000)
        );
        return true;
    }

    /**
     * @param {Array<number|string>} roomIds
     * @returns {Promise<boolean>}
     */
    async closeRooms(roomIds)
    {
        if(!this.roomsManager){
            Logger.error('Missing RoomsManager, deleted rooms can not be closed.', roomIds);
            return false;
        }
        if(!sc.isNotEmptyArray(roomIds)){
            return false;
        }
        for(let roomId of roomIds){
            await this.closeRoom(Number(roomId));
        }
        return true;
    }

    /**
     * @param {number} roomId
     * @returns {Promise<boolean>}
     */
    async closeRoom(roomId)
    {
        let roomModel = sc.get(this.roomsManager.loadedRoomsById, roomId, false);
        let roomInstance = this.roomsManager.findRoomInstanceById(roomId);
        let roomName = roomModel ? roomModel.roomName : (roomInstance ? roomInstance.roomName : '');
        if(roomName){
            this.removeRoomFromManagerLists(roomId, roomName);
            this.broadcastRoomRemoved(roomName);
        }
        if(!roomInstance){
            Logger.info('None live instance found for deleted room ID "'+roomId+'".');
            return true;
        }
        if(!this.closeActiveRoomsEnabled){
            Logger.info('Deleted rooms close behavior is disabled, instance kept for room "'+roomName+'".');
            return true;
        }
        roomInstance.broadcast('*', {
            act: RoomsConst.ROOM_CLOSING,
            listener: RoomsConst.MESSAGE_LISTENER_KEY,
            time: this.closeActiveRoomsTime,
            roomName
        });
        this.startCloseCountdown(roomInstance, roomId, roomName);
        return true;
    }

    /**
     * @param {Object} roomInstance
     * @param {number} roomId
     * @param {string} roomName
     * @returns {boolean}
     */
    startCloseCountdown(roomInstance, roomId, roomName)
    {
        let remainingSeconds = Math.ceil(this.closeActiveRoomsTime / 1000);
        let warningSeconds = Math.ceil(this.closeActiveRoomsWarningInterval / 1000);
        this.broadcastClosingCountdown(roomInstance, remainingSeconds);
        this.closeTimers[roomId] = setInterval(
            () => {
                remainingSeconds--;
                if(0 >= remainingSeconds){
                    clearInterval(this.closeTimers[roomId]);
                    this.disconnectRoomInstance(roomInstance, roomId, roomName);
                    return;
                }
                if(remainingSeconds <= warningSeconds || 0 === remainingSeconds % warningSeconds){
                    this.broadcastClosingCountdown(roomInstance, remainingSeconds);
                }
            },
            1000
        );
        return true;
    }

    /**
     * @param {Object} roomInstance
     * @param {number} remainingSeconds
     * @returns {boolean}
     */
    broadcastClosingCountdown(roomInstance, remainingSeconds)
    {
        if(0 === sc.length(roomInstance.clients)){
            return false;
        }
        let closingMessage = MessageFactory.create(
            ChatConst.TYPES.ERROR,
            ChatConst.SNIPPETS.ROOM_CLOSING,
            {[ChatConst.MESSAGE.DATA.SECONDS]: remainingSeconds}
        );
        if(!closingMessage){
            return false;
        }
        roomInstance.broadcast('*', closingMessage);
        return true;
    }

    /**
     * @param {number} roomId
     * @param {string} roomName
     * @returns {boolean}
     */
    removeRoomFromManagerLists(roomId, roomName)
    {
        if(sc.isArray(this.roomsManager.loadedRooms)){
            let roomIndex = this.roomsManager.loadedRooms.indexOf(this.roomsManager.loadedRoomsById[roomId]);
            if(-1 !== roomIndex){
                this.roomsManager.loadedRooms.splice(roomIndex, 1);
            }
        }
        delete this.roomsManager.loadedRoomsById[roomId];
        delete this.roomsManager.loadedRoomsByName[roomName];
        delete this.roomsManager.availableRoomsGuest[roomName];
        delete this.roomsManager.definedRooms[roomName];
        this.removeRoomFromSelectorList(this.roomsManager.registrationAvailableRooms, roomName);
        this.removeRoomFromSelectorList(this.roomsManager.registrationAvailableRoomsGuest, roomName);
        this.removeRoomFromSelectorList(this.roomsManager.loginAvailableRooms, roomName);
        this.removeRoomFromSelectorList(this.roomsManager.loginAvailableRoomsGuest, roomName);
        return true;
    }

    /**
     * @param {Array<Object>} selectorList
     * @param {string} roomName
     * @returns {boolean}
     */
    removeRoomFromSelectorList(selectorList, roomName)
    {
        if(!sc.isArray(selectorList)){
            return false;
        }
        for(let i = selectorList.length - 1; 0 <= i; i--){
            if(selectorList[i].name === roomName){
                selectorList.splice(i, 1);
            }
        }
        return true;
    }

    /**
     * @param {string} roomName
     * @returns {boolean}
     */
    broadcastRoomRemoved(roomName)
    {
        let createdInstancesKeys = Object.keys(this.roomsManager.createdInstances);
        for(let i of createdInstancesKeys){
            let createdInstance = this.roomsManager.createdInstances[i];
            if(RoomsConst.ROOM_TYPE_GAME !== createdInstance.roomType){
                continue;
            }
            createdInstance.broadcast('*', {act: RoomsConst.ROOM_REMOVED, roomName});
        }
        return true;
    }

    /**
     * @param {Object} roomInstance
     * @param {number} roomId
     * @param {string} roomName
     * @returns {Promise<boolean>}
     */
    async disconnectRoomInstance(roomInstance, roomId, roomName)
    {
        delete this.closeTimers[roomId];
        try {
            await roomInstance.disconnect();
            delete this.roomsManager.instanceIdByName[roomName];
            Logger.info('Closed deleted room "'+roomName+'" (ID: '+roomId+').');
        } catch (error) {
            Logger.critical('Deleted room "'+roomName+'" (ID: '+roomId+') close error. '+error.message);
            return false;
        }
        return true;
    }

}

module.exports.DeletedRoomCloser = DeletedRoomCloser;
