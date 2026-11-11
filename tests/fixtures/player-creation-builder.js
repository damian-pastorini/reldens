/**
 *
 * Reldens - PlayerCreationBuilder
 *
 * Builds the player creation setups: a PlayerCreation over a real PlayerRoomState with the users manager, the events
 * and the cross server names check recording what they get (the checked, created, held and released names and the
 * emitted events), a users manager that checks the names against the players created so far and stores them after a
 * loop turn (so the creations sent at the same time interleave), a create before listener renaming the player and the
 * creations sent at the same time by different users.
 *
 */

const { PlayerCreation } = require('../../lib/game/server/player-creation');
const { PlayerRoomState } = require('../../lib/game/server/player-room-state');
const timersPromises = require('timers/promises');

class PlayerCreationBuilder
{

    createCreationSetup(initialStateRoomId, isNameAvailable)
    {
        let creationSetup = {
            createdPlayers: [],
            emittedEvents: [],
            checkedNames: [],
            heldNames: [],
            releasedNames: [],
            isFreeOnOtherServers: true
        };
        let config = {
            get: (path, defaultValue) => defaultValue,
            getWithoutLogs: (path, defaultValue) => defaultValue,
            server: {players: {initialState: {room_id: initialStateRoomId, x: 400, y: 345, dir: 'down'}}}
        };
        let roomsManager = {
            loadRoomById: async (roomId) => 4 === roomId ? {roomId: 4, roomName: 'town'} : false,
            registrationAvailableRooms: []
        };
        creationSetup.playerCreation = new PlayerCreation({
            config,
            usersManager: {
                isNameAvailable: async (name) => creationSetup.checkedNames.push(name) && isNameAvailable,
                createPlayer: async (playerData) => {
                    creationSetup.createdPlayers.push(playerData);
                    return {id: 1, name: playerData.name, state: Object.assign({}, playerData.state)};
                }
            },
            roomsManager,
            events: {emit: async (eventName) => creationSetup.emittedEvents.push(eventName)},
            playerRoomState: new PlayerRoomState({config, roomsManager}),
            crossServerNamesCheck: {
                holdEverywhere: async (routePath, values) => {
                    creationSetup.heldNames.push(...values);
                    return creationSetup.isFreeOnOtherServers;
                },
                release: (routePath, values) => creationSetup.releasedNames.push(...values)
            },
            minimumPlayerNameLength: 3,
            maximumPlayerNameLength: 255,
            roomsSelection: {allowOnRegistration: false}
        });
        return creationSetup;
    }

    createNamesCheckingSetup()
    {
        let creationSetup = this.createCreationSetup(4, true);
        creationSetup.playerCreation.usersManager = {
            isNameAvailable: async (name) => {
                creationSetup.checkedNames.push(name);
                return !creationSetup.createdPlayers.some(
                    createdPlayer => createdPlayer.name.toLowerCase() === name.toLowerCase()
                );
            },
            createPlayer: async (playerData) => {
                await timersPromises.setImmediate();
                creationSetup.createdPlayers.push(playerData);
                return {id: creationSetup.createdPlayers.length, name: playerData.name, state: {...playerData.state}};
            }
        };
        return creationSetup;
    }

    renameOnCreateBefore(creationSetup, newName)
    {
        return async (eventName, loginData, playerData) => {
            creationSetup.emittedEvents.push(eventName);
            if('reldens.createNewPlayerBefore' === eventName){
                playerData.name = newName;
            }
        };
    }

    async createAtTheSameTime(creationSetup, playersNames)
    {
        return await Promise.all(playersNames.map((playerName, nameIndex) => {
            return creationSetup.playerCreation.createNewPlayer({'new-player-name': playerName, user_id: nameIndex+1});
        }));
    }

}

module.exports.PlayerCreationBuilder = PlayerCreationBuilder;
