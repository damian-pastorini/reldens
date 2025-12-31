/**
 *
 * Reldens - Rooms Server Plugin
 *
 * Server-side plugin managing room selection, instances, and disposal.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { RoomsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('@colyseus/core').Client} Client
 * @typedef {import('./game').RoomGame} RoomGame
 * @typedef {import('../../../generated-entities/models/objection-js/users-model').UsersModel} UsersModel
 */
class RoomsPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    async setup(props)
    {
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomsPlugin.');
        }
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in RoomsPlugin.');
        }
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverBeforeListen', this.attachRoomsManager.bind(this));
        this.events.on('reldens.beforeSuperInitialGameData', this.attachRoomSelectionAndInstancesRemoval.bind(this));
        this.events.on('reldens.onRoomDispose', this.removeRoomCreatedInstanceFromManager.bind(this));
    }

    /**
     * @param {Object} event
     */
    attachRoomsManager(event)
    {
        this.roomsManager = event?.serverManager?.roomsManager;
        if(!this.roomsManager){
            Logger.error('RoomsManager undefined in RoomsPlugin.');
        }
    }

    /**
     * @param {Object} superInitialGameData
     * @param {RoomGame} roomGame
     * @param {Client} client
     * @param {UsersModel} userModel
     * @returns {Promise<boolean|void>}
     */
    async attachRoomSelectionAndInstancesRemoval(superInitialGameData, roomGame, client, userModel)
    {
        if(!this.roomsManager){
            Logger.critical('Missing RoomsManager on RoomsPlugin.');
            return false;
        }
        if(!this.roomsManager.selectionConfig){
            Logger.error('Missing configuration on RoomsManager for RoomsPlugin.');
            return false;
        }
        if(!this.roomsManager.selectionConfig.allowOnRegistration && !this.roomsManager.selectionConfig.allowOnLogin){
            return false;
        }
        // @NOTE: we keep isGuest and isRegistration because these refer to the "user type" and the "action".
        // By "action", we refer to the first login or following ones. In future releases if a guest keeps a "login"
        // with minimal data, that could be used as "test period".
        let isRegistration = (!superInitialGameData.players || 0 === superInitialGameData.players.length);
        let isGuest = -1 !== userModel.email.indexOf(roomGame.guestEmailDomain);
        let availableRoomsForSelector = this.getAvailableRoomsForUserAndAction(isGuest, isRegistration);
        if(!availableRoomsForSelector){
            Logger.error('Not available rooms for user action.', {isGuest, isRegistration});
            return false;
        }
        if(this.roomsManager.selectionConfig.loginLastLocation && !isRegistration){
            availableRoomsForSelector = [
                {
                    name: RoomsConst.ROOM_LAST_LOCATION_KEY,
                    title: this.roomsManager.selectionConfig.loginLastLocationLabel
                },
                ...availableRoomsForSelector
            ];
        }
        superInitialGameData.roomSelection = availableRoomsForSelector;
    }

    /**
     * @param {boolean} isGuest
     * @param {boolean} isRegistration
     * @returns {Array<Object>}
     */
    getAvailableRoomsForUserAndAction(isGuest, isRegistration)
    {
        if(isRegistration){
            if(isGuest){
                return this.roomsManager.registrationAvailableRoomsGuest;
            }
            return this.roomsManager.registrationAvailableRooms;
        }
        if(isGuest){
            return this.roomsManager.loginAvailableRoomsGuest;
        }
        return this.roomsManager.loginAvailableRooms;
    }

    /**
     * @param {Object} roomData
     */
    removeRoomCreatedInstanceFromManager(roomData)
    {
        delete this.roomsManager.createdInstances[roomData.roomId];
    }

}

module.exports.RoomsPlugin = RoomsPlugin;
