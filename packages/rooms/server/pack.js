/**
 *
 * Reldens - Rooms Server Package
 *
 */

const { PackInterface } = require('../../features/pack-interface');
const { EventsManagerSingleton, sc } = require('@reldens/utils');

class RoomsPack extends PackInterface
{

    setupPack()
    {
        EventsManagerSingleton.on('reldens.beforeSuperInitialGameData', async (superInitialGameData, roomGame) => {
            await this.onBeforeSuperInitialGameData(superInitialGameData, roomGame);
        });
    }

    async onBeforeSuperInitialGameData(superInitialGameData, roomGame)
    {
        let config = roomGame.config.get('client/rooms/selection');
        if(config.allowOnRegistration || config.allowOnLogin){
            let isRegistration = (!superInitialGameData.players || superInitialGameData.players.length === 0);
            let configuredRooms = (isRegistration ? config.registrationAvailableRooms : config.loginAvailableRooms);
            let currentRooms = roomGame.loginManager.roomsManager.loadedRoomsByName;
            let availableRooms = configuredRooms === '*' ? Object.keys(currentRooms) : (await this.filterValidRooms(
                configuredRooms.split(','),
                currentRooms
            ));
            if(config.loginLastLocation && !isRegistration){
                availableRooms = [config.loginLastLocationLabel, ...availableRooms];
            }
            superInitialGameData.roomSelection = availableRooms;
        }
    }

    async filterValidRooms(configuredRooms, createdRooms)
    {
        let validRooms = [];
        for(let roomName of configuredRooms){
            if(sc.hasOwn(createdRooms, roomName)){
                validRooms.push(roomName);
            }
        }
        return validRooms;
    }

}

module.exports.RoomsPack = RoomsPack;
