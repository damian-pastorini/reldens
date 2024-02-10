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
    }

    async attachRoomSelectionAndInstancesRemoval(superInitialGameData, roomGame)
    {
        let config = roomGame.config.get('client/rooms/selection');
        if(!config){
            Logger.critical('Missing configuration on RoomsPlugin.');
            return false;
        }
        if(!this.roomsManager){
            Logger.critical('Missing RoomsManager on RoomsPlugin.');
            return false;
        }
        if(config.allowOnRegistration || config.allowOnLogin){
            let isRegistration = (!superInitialGameData.players || 0 === superInitialGameData.players.length);
            let configuredRooms = (isRegistration ? config.registrationAvailableRooms : config.loginAvailableRooms);
            let currentRooms = this.roomsManager.loadedRoomsByName;
            let availableRooms = '*' === configuredRooms ? currentRooms : (await this.filterValidRooms(
                configuredRooms.split(','),
                currentRooms
            ));
            let availableRoomsForSelector = this.extractRoomDataForSelector(availableRooms);
            if(config.loginLastLocation && !isRegistration){
                availableRoomsForSelector = [
                    {name: RoomsConst.ROOM_LAST_LOCATION_KEY, title: config.loginLastLocationLabel},
                    ...availableRoomsForSelector
                ];
            }
            superInitialGameData.roomSelection = availableRoomsForSelector;
        }
    }

    removeRoomCreatedInstanceFromManager(roomData)
    {
        delete this.roomsManager.createdInstances[roomData.roomId];
    }

    async filterValidRooms(configuredRooms, createdRooms)
    {
        let validRooms = [];
        for(let roomName of configuredRooms){
            if(sc.hasOwn(createdRooms, roomName)){
                validRooms.push(configuredRooms[roomName]);
            }
        }
        return validRooms;
    }

    extractRoomDataForSelector(availableRooms)
    {
        let titles = [];
        for(let i of Object.keys(availableRooms)){
            titles.push({name: availableRooms[i].roomName, title: availableRooms[i].roomTitle});
        }
        return titles;
    }

}

module.exports.RoomsPlugin = RoomsPlugin;
