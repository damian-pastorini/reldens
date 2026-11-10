/**
 *
 * Reldens - Test Player Creation
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerCreation } = require('../lib/game/server/player-creation');
const { PlayerRoomState } = require('../lib/game/server/player-room-state');

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
