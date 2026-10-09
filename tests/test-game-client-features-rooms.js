/**
 *
 * Reldens - Test Game Client Features Rooms
 *
 */

const { BaseTest } = require('./base-test');
const { GameClient } = require('../lib/game/client/game-client');

class TestGameClientFeaturesRooms extends BaseTest
{

    createGameClient(featuresRoomsNames, serverUrl = 'http://localhost:8080')
    {
        return new GameClient(serverUrl, {
            getWithoutLogs: (path, defaultValue) => {
                return 'client/rooms/featuresRoomsNames' === path ? featuresRoomsNames : defaultValue;
            }
        });
    }

    async testTheFeaturesRoomsAreJoinedOnTheOtherServer()
    {
        await this.test('the feature rooms are joined on another server when the rooms names are set', async () => {
            let joinedRooms = [];
            let gameClient = this.createGameClient(['chat', 'teams']);
            await gameClient.connectToGlobalFeaturesRooms(
                'http://localhost:8081',
                {joinOrCreate: async (roomName) => joinedRooms.push(roomName) && {roomName}},
                {selectedPlayer: 1}
            );
            this.assert.deepStrictEqual(joinedRooms, ['chat', 'teams']);
            this.assert.deepStrictEqual(Object.keys(gameClient.featuresRoomsByServer['http://localhost:8081']), [
                'chat',
                'teams'
            ]);
        });
    }

    async testNoFeaturesRoomsAreJoinedWithoutRoomsNames()
    {
        await this.test('no feature room is joined when there are no feature rooms names', async () => {
            let joinedRooms = [];
            let gameClient = this.createGameClient([]);
            await gameClient.connectToGlobalFeaturesRooms(
                'http://localhost:8081',
                {joinOrCreate: async (roomName) => joinedRooms.push(roomName)},
                {selectedPlayer: 1}
            );
            this.assert.deepStrictEqual(joinedRooms, []);
            this.assert.strictEqual(gameClient.featuresByServerFlag['http://localhost:8081'], true);
        });
    }

    async testTheCurrentServerRoomsAreNotJoinedAgainWithAnHttpUrl()
    {
        await this.test('the game and feature rooms are not joined again on the current server http url', async () => {
            let joinedRooms = [];
            let gameClient = this.createGameClient(['chat'], 'ws://localhost:8080');
            let client = {joinOrCreate: async (roomName) => joinedRooms.push(roomName) && {roomName}};
            await gameClient.connectToGlobalGameRoom('http://localhost:8080', client, {selectedPlayer: 1});
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8080/', client, {selectedPlayer: 1});
            this.assert.deepStrictEqual(joinedRooms, []);
            this.assert.deepStrictEqual(gameClient.featuresByServerFlag, {});
        });
    }

    async testAnotherServerPortWithAnotherSchemeIsStillJoined()
    {
        await this.test('the feature rooms are joined on another server port with a different url scheme', async () => {
            let joinedRooms = [];
            let gameClient = this.createGameClient(['chat'], 'ws://localhost:8080');
            await gameClient.connectToGlobalFeaturesRooms(
                'http://localhost:8081',
                {joinOrCreate: async (roomName) => joinedRooms.push(roomName) && {roomName}},
                {selectedPlayer: 1}
            );
            this.assert.deepStrictEqual(joinedRooms, ['chat']);
        });
    }

}

module.exports.TestGameClientFeaturesRooms = TestGameClientFeaturesRooms;
