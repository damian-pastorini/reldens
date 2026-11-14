/**
 *
 * Reldens - Test Game Client Features Rooms
 *
 */

const { BaseTest } = require('./base-test');
const { GameClient } = require('../lib/game/client/game-client');
const { GameConst } = require('../lib/game/constants');

class TestGameClientFeaturesRooms extends BaseTest
{

    createGameClient(featuresRoomsNames, serverUrl = 'http://localhost:8080')
    {
        return new GameClient(
            serverUrl,
            {
                getWithoutLogs: (path, defaultValue) => {
                    return 'client/rooms/featuresRoomsNames' === path ? featuresRoomsNames : defaultValue;
                }
            }
        );
    }

    createFailingOnceClient(failingRoomName, joinAttempts)
    {
        let failingClient = {failedRooms: []};
        failingClient.joinOrCreate = async (roomName) => {
            joinAttempts.push(roomName);
            if(failingRoomName !== roomName || failingClient.failedRooms.includes(roomName)){
                return {roomName};
            }
            failingClient.failedRooms.push(roomName);
            return Promise.reject(new Error('The server is busy.'));
        };
        return failingClient;
    }

    createLeavingClient(joinedRooms, leftRooms)
    {
        return {
            joinOrCreate: async (roomName, options) => {
                joinedRooms.push([roomName, options.selectedPlayer]);
                return {
                    roomName,
                    onMessage: () => true,
                    leave: async () => leftRooms.push(roomName)
                };
            }
        };
    }

    async testAFailedFeatureRoomIsJoinedOnTheNextAttempt()
    {
        await this.test('a remote feature room that failed to join is joined on the next attempt', async () => {
            let joinAttempts = [];
            let gameClient = this.createGameClient(['chat', 'teams']);
            let client = this.createFailingOnceClient('teams', joinAttempts);
            let firstAttempt = await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {})
                .catch((error) => error.message);
            this.assert.strictEqual(firstAttempt, 'The server is busy.');
            this.assert.deepStrictEqual(gameClient.featuresByServerFlag, {});
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {});
            this.assert.deepStrictEqual(joinAttempts, ['chat', 'teams', 'teams']);
            this.assert.strictEqual(gameClient.featuresByServerFlag['http://localhost:8081'], true);
            this.assert.deepStrictEqual(Object.keys(gameClient.featuresRoomsByServer['http://localhost:8081']), [
                'chat',
                'teams'
            ]);
        });
    }

    async testLeavingTheServersRoomsJoinsThemAgainForTheNextPlayer()
    {
        await this.test('leaving the remote rooms clears them so the next player joins them again', async () => {
            let joinedRooms = [];
            let leftRooms = [];
            let gameClient = this.createGameClient(['chat']);
            let client = this.createLeavingClient(joinedRooms, leftRooms);
            await gameClient.connectToGlobalGameRoom('http://localhost:8081', client, {selectedPlayer: 1});
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {selectedPlayer: 1});
            await gameClient.leaveServersRooms();
            this.assert.deepStrictEqual(leftRooms, [GameConst.ROOM_GAME, 'chat']);
            this.assert.deepStrictEqual(gameClient.featuresByServerFlag, {});
            await gameClient.connectToGlobalGameRoom('http://localhost:8081', client, {selectedPlayer: 2});
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {selectedPlayer: 2});
            this.assert.deepStrictEqual(joinedRooms, [
                [GameConst.ROOM_GAME, 1],
                ['chat', 1],
                [GameConst.ROOM_GAME, 2],
                ['chat', 2]
            ]);
        });
    }

    async testTheJoinedFeatureRoomsRunTheJoinedRoomSetup()
    {
        await this.test('every feature room joined on another server runs the joined room setup', async () => {
            let setupRooms = [];
            let gameClient = this.createGameClient(['chat', 'teams']);
            gameClient.onFeatureRoomJoined = async (featureRoom, featureRoomName) => setupRooms.push([
                featureRoom.roomName,
                featureRoomName
            ]);
            await gameClient.connectToGlobalFeaturesRooms(
                'http://localhost:8081',
                {joinOrCreate: async (roomName) => ({roomName})},
                {selectedPlayer: 1}
            );
            this.assert.deepStrictEqual(setupRooms, [['chat', 'chat'], ['teams', 'teams']]);
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
