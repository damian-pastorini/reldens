/**
 *
 * Reldens - PlayerCreationBuilder
 *
 * Builds the player creation setups: a PlayerCreation over a real PlayerRoomState with the users manager, the events
 * and the cross server names check recording what they get (the checked, created, deleted, held and released names, a
 * release counted only with the hold id its hold gave, and
 * the emitted events, with the multiple players on and the players count of each user taken from the created players),
 * a users manager that checks the names against the players created so far and stores them after a
 * loop turn (so the creations sent at the same time interleave), a create before listener renaming the player, the
 * class path listeners of the actions plugin over the real PlayerClassPathHandler (the create before validation against
 * the offered class paths, the known ones by default, and the created player storage of the selected or initial class
 * path, where a class path id the storage does not know is refused like its foreign key does) and the creations sent
 * at the same time by different users.
 *
 */

const { PlayerCreation } = require('../../lib/game/server/player-creation');
const { PlayerRoomState } = require('../../lib/game/server/player-room-state');
const { PlayerClassPathHandler } = require('../../lib/actions/server/player-class-path-handler');
const timersPromises = require('timers/promises');

class PlayerCreationBuilder
{

    createCreationSetup(initialStateRoomId, isNameAvailable)
    {
        let creationSetup = {
            createdPlayers: [],
            deletedPlayerIds: [],
            storedClassPaths: [],
            emittedEvents: [],
            checkedNames: [],
            heldNames: [],
            releasedNames: [],
            isFreeOnOtherServers: true
        };
        let config = {
            get: (path, defaultValue) => defaultValue,
            getWithoutLogs: (path, defaultValue) => defaultValue,
            server: {players: {initialState: {room_id: initialStateRoomId, x: 400, y: 345, dir: 'down'}}},
            skills: {classPaths: {classPathsById: {1: {}, 2: {}}}}
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
                },
                deletePlayer: async (playerId) => creationSetup.deletedPlayerIds.push(playerId),
                playersRepository: this.createPlayersRepository(creationSetup)
            },
            roomsManager,
            events: {emit: async (eventName) => creationSetup.emittedEvents.push(eventName)},
            playerRoomState: new PlayerRoomState({config, roomsManager}),
            crossServerNamesCheck: {
                holdEverywhere: async (routePath, values) => {
                    creationSetup.heldNames.push(...values);
                    return creationSetup.isFreeOnOtherServers ? 'hold-'+values.join('-') : false;
                },
                release: (routePath, values, holdId) => 'hold-'+values.join('-') === holdId
                    && creationSetup.releasedNames.push(...values)
            },
            minimumPlayerNameLength: 3,
            maximumPlayerNameLength: 255,
            roomsSelection: {allowOnRegistration: false},
            isMultiplePlayersEnabled: true
        });
        return creationSetup;
    }

    createPlayersRepository(creationSetup)
    {
        return {
            count: async (filters) => creationSetup.createdPlayers.filter(
                createdPlayer => createdPlayer.user_id === filters.user_id
            ).length
        };
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
            },
            deletePlayer: async (playerId) => creationSetup.deletedPlayerIds.push(playerId),
            playersRepository: this.createPlayersRepository(creationSetup)
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

    createClassPathDataServer(creationSetup, knownClassPathIds)
    {
        return {getEntity: () => ({
            create: async (classPathData) => -1 === knownClassPathIds.indexOf(Number(classPathData.class_path_id))
                ? Promise.reject({message: 'A foreign key constraint fails on the class_path_id.'})
                : creationSetup.storedClassPaths.push(classPathData) && classPathData
        })};
    }

    storeClassPathOnCreated(creationSetup, knownClassPathIds, offeredClassPathIds = knownClassPathIds)
    {
        let classPathsById = {};
        for(let classPathId of offeredClassPathIds){
            classPathsById[classPathId] = {id: classPathId};
        }
        return async (eventName, ...eventArgs) => {
            creationSetup.emittedEvents.push(eventName);
            let initialClassPathId = creationSetup.playerCreation.config.get('server/players/actions/initialClassPathId');
            if('reldens.createNewPlayerBefore' === eventName){
                PlayerClassPathHandler.validateSelection({
                    loginData: eventArgs[0],
                    initialClassPathId,
                    classPathsById,
                    creationResult: eventArgs[3]
                });
            }
            if('reldens.createdNewPlayer' === eventName){
                await PlayerClassPathHandler.createFromLoginData({
                    loginData: eventArgs[1],
                    initialClassPathId,
                    player: eventArgs[0],
                    dataServer: this.createClassPathDataServer(creationSetup, knownClassPathIds)
                });
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
