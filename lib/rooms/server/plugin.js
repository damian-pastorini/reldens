/**
 *
 * Reldens - Rooms Server Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { RoomsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class RoomsPlugin extends PluginInterface
{

    setup(props)
    {
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomsPlugin.');
        }
        this.config = sc.get(props, 'config', false);
        if(!this.config){
            Logger.error('Config undefined in RoomsPlugin.');
        }
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.serverBeforeListen', this.attachRoomsManager.bind(this));
        this.events.on('reldens.beforeSuperInitialGameData', this.attachRoomSelectionAndInstancesRemoval.bind(this));
        this.events.on('reldens.onRoomDispose', this.removeRoomCreatedInstanceFromManager.bind(this));
    }

    attachRoomsManager(event)
    {
        this.roomsManager = event?.serverManager?.roomsManager;
        if(!this.roomsManager){
            Logger.error('RoomsManager undefined in RoomsPlugin.');
        }
    }

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
        // @NOTE: we keep isGuest and isRegistration because these referrers to the "user type" and the "action".
        // By "action", we are referring to first login or following ones. In future releases if a guest keeps a "login"
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

    removeRoomCreatedInstanceFromManager(roomData)
    {
        delete this.roomsManager.createdInstances[roomData.roomId];
    }

}

module.exports.RoomsPlugin = RoomsPlugin;
