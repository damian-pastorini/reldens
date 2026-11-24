/**
 *
 * Reldens - Test Game Client Features Rooms
 *
 * Tests the rooms a client joins on every server: the feature rooms of another server (joined again after a failure or
 * a logout, with their joined room setup, none without rooms names), the game and feature rooms never joined again on
 * the current server, the chat of the scene server for the global messages, and a page opened through another host of
 * the login server (ISSUE #457): its login server rooms use the page url, so its scene is joined alone and the game room
 * is joined again only for a room of another server, and an unparsable room url (or login server url) is returned as it
 * is instead of throwing, so its join fails inside the join error handling.
 *
 */

const { BaseTest } = require('./base-test');
const { GameClient } = require('../lib/game/client/game-client');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestGameClientFeaturesRooms extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.loginServerUrl = 'http://localhost:8080';
        this.otherServerUrl = 'http://localhost:8081';
        this.aliasPageUrl = 'ws://[::1]:8080';
    }

    createGameClient(featuresRoomsNames, serverUrl = 'http://localhost:8080', configValues = {})
    {
        return new GameClient(serverUrl, {getWithoutLogs: (path, defaultValue) => sc.get(
            Object.assign({'client/rooms/featuresRoomsNames': featuresRoomsNames}, configValues),
            path,
            defaultValue
        )});
    }

    createAliasHostClient(configValues)
    {
        return this.createGameClient([], this.aliasPageUrl, Object.assign({
            'client/rooms/servers/reldens-town': this.loginServerUrl,
            'client/rooms/servers/reldens-house-2': this.otherServerUrl
        }, configValues));
    }

    recordJoinedRoom(sceneRoomName, roomName, joinedRooms)
    {
        joinedRooms.push([sceneRoomName, roomName]);
        return {roomName, onMessage: () => true};
    }

    async testTheLoginServerRoomsUseThePageUrl()
    {
        await this.test('a room of the login server uses the page url, another server room and no login server url keep the config url (ISSUE #457)', async () => {
            let aliasClient = this.createAliasHostClient({'client/rooms/loginServerUrl': this.loginServerUrl});
            let noLoginServerClient = this.createAliasHostClient({});
            this.assert.deepStrictEqual(
                [
                    aliasClient.fetchRoomServerUrl('reldens-town'),
                    aliasClient.fetchRoomServerUrl('reldens-house-2'),
                    aliasClient.fetchRoomServerUrl('reldens-forest'),
                    noLoginServerClient.fetchRoomServerUrl('reldens-town')
                ],
                [this.aliasPageUrl, this.otherServerUrl, this.aliasPageUrl, this.loginServerUrl]
            );
        });
    }

    async testAnUnparsableRoomUrlIsKeptWithAndWithoutTheLoginServerUrl()
    {
        await this.test('an unparsable room url is returned unchanged with and without the login server url, never thrown', async () => {
            let unparsableUrl = {'client/rooms/servers/reldens-house-1': 'e2e not a server url'};
            let fetchedUrls = [];
            for(let loginServerUrl of [this.loginServerUrl, 'e2e not a login url', '']){
                let configValues = Object.assign({'client/rooms/loginServerUrl': loginServerUrl}, unparsableUrl);
                fetchedUrls.push(this.createAliasHostClient(configValues).fetchRoomServerUrl('reldens-house-1'));
            }
            this.assert.deepStrictEqual(fetchedUrls, ['e2e not a server url', 'e2e not a server url', 'e2e not a server url']);
        });
    }

    async testAnAliasHostPageJoinsTheGameRoomOnlyForAnotherServer()
    {
        await this.test('a page on another host of the login server joins its scene alone and the game room only for another server', async () => {
            let aliasClient = this.createAliasHostClient({'client/rooms/loginServerUrl': this.loginServerUrl});
            let joinedRooms = [];
            for(let sceneRoomName of ['reldens-town', 'reldens-house-2']){
                aliasClient.roomClient(sceneRoomName);
                aliasClient.roomClients[sceneRoomName] = {
                    joinOrCreate: async (roomName) => this.recordJoinedRoom(sceneRoomName, roomName, joinedRooms)
                };
                await aliasClient.joinOrCreate(sceneRoomName, {selectedPlayer: 1});
            }
            this.assert.deepStrictEqual(joinedRooms, [
                ['reldens-town', 'reldens-town'],
                ['reldens-house-2', GameConst.ROOM_GAME],
                ['reldens-house-2', 'reldens-house-2']
            ]);
        });
    }

    createFailingOnceClient(failingRoomName, joinAttempts)
    {
        let failingClient = {failedRooms: []};
        failingClient.joinOrCreate = async (roomName) => {
            joinAttempts.push(roomName);
            if(failingRoomName !== roomName || failingClient.failedRooms.includes(roomName)){
                return {roomName, connection: {isOpen: true}};
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
            this.assert.deepStrictEqual(Object.keys(gameClient.featuresRoomsByServer['http://localhost:8081']), ['chat']);
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {});
            this.assert.deepStrictEqual(joinAttempts, ['chat', 'teams', 'teams']);
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
            this.assert.deepStrictEqual(
                [leftRooms, gameClient.gameRoomsByServer, gameClient.featuresRoomsByServer],
                [[GameConst.ROOM_GAME, 'chat'], {}, {}]
            );
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
            this.assert.deepStrictEqual([joinedRooms, gameClient.featuresRoomsByServer], [[], {'http://localhost:8081': {}}]);
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
            this.assert.deepStrictEqual(
                [joinedRooms, gameClient.gameRoomsByServer, gameClient.featuresRoomsByServer],
                [[], {}, {}]
            );
        });
    }

    async testTheChatOfTheSceneServerIsUsedForTheGlobalMessages()
    {
        await this.test('the global messages use the open chat of the scene server, the joined chat otherwise', async () => {
            let gameClient = this.createGameClient(['chat']);
            await gameClient.connectToGlobalFeaturesRooms(
                'http://localhost:8081',
                {joinOrCreate: async (roomName) => ({roomName, server: 'server-2', connection: {isOpen: true}})},
                {selectedPlayer: 1}
            );
            gameClient.roomsUrls = {'reldens-house-2': 'http://localhost:8081', 'reldens-town': 'http://localhost:8080'};
            let joinedRooms = {chat: {roomName: 'chat', server: 'server-1'}};
            let usedChats = [];
            for(let sceneRoomName of ['reldens-house-2', 'reldens-town', 'reldens-forest']){
                usedChats.push(gameClient.serverFeatureRoom(sceneRoomName, 'chat', joinedRooms).server);
            }
            usedChats.push(gameClient.serverFeatureRoom('reldens-house-2', 'teams', {}));
            gameClient.featuresRoomsByServer['http://localhost:8081'].chat.connection.isOpen = false;
            usedChats.push(gameClient.serverFeatureRoom('reldens-house-2', 'chat', joinedRooms).server);
            this.assert.deepStrictEqual(usedChats, ['server-2', 'server-1', 'server-1', false, 'server-1']);
        });
    }

    async testClosedServerRoomsAreJoinedAgain()
    {
        await this.test('the game and feature rooms of another server closed by a logout are joined again, open ones are kept', async () => {
            let joinedRooms = [];
            let gameClient = this.createGameClient(['chat', 'teams']);
            let client = {joinOrCreate: async (roomName) => joinedRooms.push(roomName) && {
                roomName,
                onMessage: () => true,
                connection: {isOpen: true}
            }};
            await gameClient.connectToGlobalGameRoom('http://localhost:8081', client, {selectedPlayer: 1});
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {selectedPlayer: 1});
            gameClient.gameRoomsByServer['http://localhost:8081'].connection.isOpen = false;
            gameClient.featuresRoomsByServer['http://localhost:8081'].chat.connection.isOpen = false;
            await gameClient.connectToGlobalGameRoom('http://localhost:8081', client, {selectedPlayer: 1});
            await gameClient.connectToGlobalFeaturesRooms('http://localhost:8081', client, {selectedPlayer: 1});
            this.assert.deepStrictEqual(joinedRooms, [GameConst.ROOM_GAME, 'chat', 'teams', GameConst.ROOM_GAME, 'chat']);
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
