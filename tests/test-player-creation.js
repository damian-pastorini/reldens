/**
 *
 * Reldens - Test Player Creation
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerCreation } = require('../lib/game/server/player-creation');
const { PlayerRoomState } = require('../lib/game/server/player-room-state');
const timersPromises = require('timers/promises');

class TestPlayerCreation extends BaseTest
{

    createCreationSetup(initialStateRoomId, isNameAvailable)
    {
        let creationSetup = {createdPlayers: [], emittedEvents: [], checkedNames: []};
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

    async testTheSameNameCreatedAtTheSameTimeIsGivenOnce()
    {
        await this.test('two players created with the same name at the same time get the name only once', async () => {
            let creationSetup = this.createNamesCheckingSetup();
            let results = await this.createAtTheSameTime(creationSetup, ['samename', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.strictEqual(
                results[1].message,
                'The player name is not available, please choose another name.'
            );
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [1]);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.playerNewNameUnavailable');
        });
    }

    async testTheSameNameWithAnotherCaseWaitsForTheFirstCreation()
    {
        await this.test('the same name with another letter case waits for the first creation and is rejected', async () => {
            let creationSetup = this.createNamesCheckingSetup();
            let results = await this.createAtTheSameTime(creationSetup, ['SameName', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['SameName']);
        });
    }

    async testDifferentNamesCreatedAtTheSameTimeAreAllStored()
    {
        await this.test('players created with different names at the same time are all stored', async () => {
            let creationSetup = this.createNamesCheckingSetup();
            let results = await this.createAtTheSameTime(creationSetup, ['first', 'second']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, false]);
            this.assert.deepStrictEqual(
                creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name).sort(),
                ['first', 'second']
            );
        });
    }

    async testTheNameSetByTheCreateBeforeListenerIsTheCheckedOne()
    {
        await this.test('the name changed by a create before listener is the one checked and given once', async () => {
            let creationSetup = this.createNamesCheckingSetup();
            creationSetup.playerCreation.events = {emit: this.renameOnCreateBefore(creationSetup, 'renamed')};
            let results = await this.createAtTheSameTime(creationSetup, ['first', 'second']);
            this.assert.deepStrictEqual(results.map(result => result.error), [false, true]);
            this.assert.deepStrictEqual(creationSetup.checkedNames, ['renamed', 'renamed']);
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.name), ['renamed']);
        });
    }

    async testAFailedNameCheckDoesNotBlockTheNextCreationWithThatName()
    {
        await this.test('a failed name check returns the creation error and the next creation with that name runs', async () => {
            let creationSetup = this.createNamesCheckingSetup();
            let isNameAvailable = creationSetup.playerCreation.usersManager.isNameAvailable;
            let loadError = new Error('Players load failed.');
            creationSetup.playerCreation.usersManager.isNameAvailable = async () => {
                creationSetup.playerCreation.usersManager.isNameAvailable = isNameAvailable;
                throw loadError;
            };
            let results = await this.createAtTheSameTime(creationSetup, ['samename', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [true, false]);
            this.assert.strictEqual(results[0].message, 'There was an error creating your player, please try again.');
            this.assert.ok(creationSetup.emittedEvents.includes('reldens.createNewPlayerCriticalError'));
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [2]);
        });
    }

    async testAFailedStoreReturnsTheCreationError()
    {
        await this.test('a failed player store returns the creation error and frees the name for the next creation', async () => {
            let creationSetup = this.createNamesCheckingSetup();
            let createPlayer = creationSetup.playerCreation.usersManager.createPlayer;
            let insertError = new Error('Player insert failed.');
            creationSetup.playerCreation.usersManager.createPlayer = async () => {
                creationSetup.playerCreation.usersManager.createPlayer = createPlayer;
                throw insertError;
            };
            let results = await this.createAtTheSameTime(creationSetup, ['samename', 'samename']);
            this.assert.deepStrictEqual(results.map(result => result.error), [true, false]);
            this.assert.strictEqual(results[0].message, 'There was an error creating your player, please try again.');
            this.assert.deepStrictEqual(creationSetup.createdPlayers.map(createdPlayer => createdPlayer.user_id), [2]);
        });
    }

    async testTheShortPlayerNameIsRejected()
    {
        await this.test('a player name shorter than the minimum is rejected before the player is stored', async () => {
            let creationSetup = this.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'ab', user_id: 1});
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.deepStrictEqual(creationSetup.emittedEvents, ['reldens.playerNewName']);
        });
    }

    async testTheUnavailablePlayerNameIsRejected()
    {
        await this.test('a player name that is not available is rejected before the player is stored', async () => {
            let creationSetup = this.createCreationSetup(4, false);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'taken', user_id: 1});
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.playerNewNameUnavailable');
        });
    }

    async testTheInitialStateInAMissingRoomIsRejected()
    {
        await this.test('an initial state in a missing room is rejected before the player is stored', async () => {
            let creationSetup = this.createCreationSetup(99, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.error, true);
            this.assert.strictEqual(creationSetup.createdPlayers.length, 0);
            this.assert.deepStrictEqual(creationSetup.emittedEvents, ['reldens.playerSceneUnavailable']);
        });
    }

    async testTheCreatedPlayerStateGetsTheRoomName()
    {
        await this.test('the created player is stored for the user and its state gets the room name', async () => {
            let creationSetup = this.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer({'new-player-name': 'player', user_id: 1});
            this.assert.strictEqual(result.error, false);
            this.assert.strictEqual(result.player.state.scene, 'town');
            this.assert.strictEqual([...creationSetup.createdPlayers].shift().user_id, 1);
            this.assert.strictEqual(creationSetup.emittedEvents.pop(), 'reldens.createdNewPlayer');
        });
    }

    async testTheLongPlayerNameIsCutToTheNameColumnSize()
    {
        await this.test('a name over the 255 characters column is cut before it is checked and stored', async () => {
            for(let nameLength of [255, 300]){
                let creationSetup = this.createCreationSetup(4, true);
                let result = await creationSetup.playerCreation.createNewPlayer(
                    {'new-player-name': 'a'.repeat(nameLength), user_id: 1}
                );
                this.assert.strictEqual(result.error, false);
                this.assert.deepStrictEqual(creationSetup.checkedNames, ['a'.repeat(255)]);
                this.assert.strictEqual([...creationSetup.createdPlayers].shift().name, 'a'.repeat(255));
            }
        });
    }

    async testTheLongPlayerNameIsCutByCharactersNotByCodeUnits()
    {
        await this.test('a long name is cut by characters, so a character at the limit is never split', async () => {
            let creationSetup = this.createCreationSetup(4, true);
            let result = await creationSetup.playerCreation.createNewPlayer(
                {'new-player-name': 'a'.repeat(254)+'\u{1F600}b', user_id: 1}
            );
            this.assert.strictEqual(result.error, false);
            this.assert.strictEqual([...creationSetup.createdPlayers].shift().name, 'a'.repeat(254)+'\u{1F600}');
        });
    }

}

module.exports.TestPlayerCreation = TestPlayerCreation;
