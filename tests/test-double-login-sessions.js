/**
 *
 * Reldens - Test Double Login Sessions
 *
 */

const { BaseTest } = require('./base-test');
const { ActiveSessionsBuilder } = require('./fixtures/active-sessions-builder');
const { GameRoomsConnections } = require('../lib/game/client/game-rooms-connections');
const { SyncServerDriver } = require('../lib/sync/server/colyseus/sync-server-driver');
const { SyncClientDriver } = require('../lib/sync/client/colyseus/sync-client-driver');
const { GameConst } = require('../lib/game/constants');

class TestDoubleLoginSessions extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.userModel = ActiveSessionsBuilder.createUserModel(1, 'root', 'ImRoot');
        this.consentedCode = SyncServerDriver.CloseCode.CONSENTED;
    }

    joinEveryRoom(setup, sessionPrefix)
    {
        ActiveSessionsBuilder.joinRoom(setup, setup.sceneRoom, sessionPrefix+'-scene', this.userModel);
        ActiveSessionsBuilder.joinRoom(setup, setup.chatRoom, sessionPrefix+'-chat', this.userModel);
        return ActiveSessionsBuilder.joinRoom(setup, setup.gameRoom, sessionPrefix+'-game', this.userModel);
    }

    prepareLobbyJoin(setup)
    {
        setup.otherRoomsDisconnections = [];
        setup.sentMessages = [];
        setup.gameRoom.events = {emit: async () => true};
        setup.gameRoom.roomsAvailability = false;
        setup.gameRoom.config = {
            getWithoutLogs: (path, defaultValue) => defaultValue,
            client: {},
            gameEngine: {},
            availableFeaturesList: []
        };
        Object.assign(setup.gameRoom.loginManager, {
            updateLastLogin: async () => true,
            isGuestUser: () => false,
            userDisconnection: {
                disconnectUserFromEveryRoom: async (userModel, avoidGameRoom) => setup.otherRoomsDisconnections.push(
                    [userModel.username, avoidGameRoom]
                )
            }
        });
        let newClient = ActiveSessionsBuilder.createClient(setup, 'new-game');
        newClient.send = (type, message) => setup.sentMessages.push(message);
        return newClient;
    }

    async testTheDoubleLoginClosesTheOldLobbySession()
    {
        await this.test('a double login ends the old tab rooms and closes its lobby session as consented', async () => {
            let setup = ActiveSessionsBuilder.createSetup();
            this.joinEveryRoom(setup, 'old');
            let newClient = this.prepareLobbyJoin(setup);
            await setup.gameRoom.onJoin(newClient, {}, this.userModel);
            this.assert.deepStrictEqual(setup.otherRoomsDisconnections, [['root', true]]);
            this.assert.deepStrictEqual(setup.closedSessions, [['old-game', this.consentedCode]]);
            this.assert.strictEqual(
                setup.gameRoom.activePlayerByUserName('root', ActiveSessionsBuilder.GAME_ROOM_ID, false).client,
                newClient
            );
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), [
                'old-scene',
                'old-chat',
                'new-game'
            ]);
            this.assert.strictEqual(setup.sentMessages[0][GameConst.ACTION_KEY], GameConst.START_GAME);
        });
    }

    async testTheFirstLoginClosesNoSession()
    {
        await this.test('a first login closes no session and disconnects no other room', async () => {
            let setup = ActiveSessionsBuilder.createSetup();
            let newClient = this.prepareLobbyJoin(setup);
            await setup.gameRoom.onJoin(newClient, {}, this.userModel);
            this.assert.deepStrictEqual(setup.otherRoomsDisconnections, []);
            this.assert.deepStrictEqual(setup.closedSessions, []);
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), ['new-game']);
        });
    }

    async testTheOldTabLobbyLeaveKeepsTheNewTabSessions()
    {
        await this.test('the old tab lobby leave removes only its session and keeps the new tab sessions', async () => {
            let setup = ActiveSessionsBuilder.createSetup();
            let oldGameClient = ActiveSessionsBuilder.joinRoom(setup, setup.gameRoom, 'old-game', this.userModel);
            let newGameClient = this.joinEveryRoom(setup, 'new');
            await setup.gameRoom.onLeave(oldGameClient);
            this.assert.deepStrictEqual(
                ActiveSessionsBuilder.fetchUserSessions(setup, 1),
                ['new-scene', 'new-chat', 'new-game']
            );
            this.assert.strictEqual(
                setup.gameRoom.activePlayerByUserName('root', ActiveSessionsBuilder.GAME_ROOM_ID, false).client,
                newGameClient
            );
        });
    }

    async testASceneLeaveRemovesOnlyItsOwnSession()
    {
        await this.test('a scene leave removes only its session, the lobby and chat leaves remove theirs', async () => {
            let setup = ActiveSessionsBuilder.createSetup();
            setup.chatRoom.config = {getWithoutLogs: (path, defaultValue) => defaultValue};
            this.joinEveryRoom(setup, 'tab');
            let sceneClient = setup.sceneRoom.activePlayerBySessionId('tab-scene', 'scene-room').client;
            setup.sceneRoom.removeActivePlayer({sessionId: 'tab-scene', userId: 1}, sceneClient);
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), ['tab-chat', 'tab-game']);
            await setup.gameRoom.onLeave(setup.gameRoom.activePlayerBySessionId('tab-game', 'game-room', false).client);
            await setup.chatRoom.onLeave(setup.chatRoom.activePlayerBySessionId('tab-chat', 'chat-room').client, true);
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), []);
        });
    }

    prepareSceneDisconnection(setup, savedState)
    {
        setup.removedPlayers = [];
        setup.sceneRoom.events = {emit: async () => true};
        setup.sceneRoom.playerBySessionIdFromState = (sessionId) => 'old-scene' === sessionId ? {sessionId} : null;
        setup.sceneRoom.savePlayedTime = async () => true;
        setup.sceneRoom.savePlayerStats = async () => true;
        setup.sceneRoom.savePlayerState = async () => savedState;
        setup.sceneRoom.removePlayer = async (sessionId) => setup.removedPlayers.push(sessionId);
        return ActiveSessionsBuilder.joinRoom(setup, setup.sceneRoom, 'old-scene', this.userModel);
    }

    async testTheEndedSceneSessionIsRemovedFromTheActivePlayers()
    {
        await this.test('the ended scene session is removed with its player and kept when the save fails', async () => {
            for(let savedState of [true, false]){
                let setup = ActiveSessionsBuilder.createSetup();
                let oldSceneClient = this.prepareSceneDisconnection(setup, savedState);
                this.assert.strictEqual(
                    await setup.sceneRoom.disconnectBySessionId('old-scene', oldSceneClient, this.userModel),
                    true
                );
                this.assert.deepStrictEqual(setup.removedPlayers, savedState ? ['old-scene'] : []);
                this.assert.deepStrictEqual(
                    ActiveSessionsBuilder.fetchUserSessions(setup, 1),
                    savedState ? [] : ['old-scene']
                );
                this.assert.deepStrictEqual(setup.closedSessions, []);
            }
        });
    }

    async testAMissingScenePlayerIsNotDisconnected()
    {
        await this.test('a scene session without player in the room is not disconnected nor removed', async () => {
            let setup = ActiveSessionsBuilder.createSetup();
            this.prepareSceneDisconnection(setup, true);
            let otherClient = ActiveSessionsBuilder.joinRoom(setup, setup.sceneRoom, 'other-scene', this.userModel);
            this.assert.strictEqual(
                await setup.sceneRoom.disconnectBySessionId('other-scene', otherClient, this.userModel),
                false
            );
            this.assert.deepStrictEqual(setup.removedPlayers, []);
            this.assert.deepStrictEqual(
                ActiveSessionsBuilder.fetchUserSessions(setup, 1),
                ['old-scene', 'other-scene']
            );
        });
    }

    createClientGameManager(gameOver)
    {
        let gameManager = {gameOver, alerts: [], services: {translator: {t: (snippetKey) => 'translated:'+snippetKey}}};
        gameManager.gameDom = {alertReload: (message) => gameManager.alerts.push(message)};
        return gameManager;
    }

    async testTheClosedOldLobbyShowsTheSessionEnded()
    {
        await this.test('the old lobby closed by the double login shows the session ended message once', async () => {
            let gameManager = this.createClientGameManager(false);
            let roomsConnections = new GameRoomsConnections(gameManager);
            let consentedCode = SyncClientDriver.CloseCode.CONSENTED;
            this.assert.strictEqual(roomsConnections.endSessionOnGameRoomLeave(consentedCode), true);
            this.assert.deepStrictEqual(gameManager.alerts, ['translated:game.errors.sessionEnded']);
            this.assert.strictEqual(gameManager.gameOver, true);
            this.assert.strictEqual(roomsConnections.endSessionOnGameRoomLeave(consentedCode), false);
            this.assert.strictEqual(gameManager.alerts.length, 1);
        });
    }

    async testTheGameOverTabIsNotAlertedByTheLobbyClose()
    {
        await this.test('a tab already showing the game over message is not alerted by the lobby close', async () => {
            let gameManager = this.createClientGameManager(true);
            this.assert.strictEqual(
                new GameRoomsConnections(gameManager).endSessionOnGameRoomLeave(SyncClientDriver.CloseCode.CONSENTED),
                false
            );
            this.assert.deepStrictEqual(gameManager.alerts, []);
        });
    }

    async testOtherLobbyClosesShowNothing()
    {
        await this.test('a lobby close that is not consented shows nothing and keeps the game running', async () => {
            let closeCodes = SyncClientDriver.CloseCode;
            for(let code of [closeCodes.NORMAL_CLOSURE, closeCodes.ABNORMAL_CLOSURE, closeCodes.SERVER_SHUTDOWN]){
                let gameManager = this.createClientGameManager(false);
                this.assert.strictEqual(new GameRoomsConnections(gameManager).endSessionOnGameRoomLeave(code), false);
                this.assert.deepStrictEqual(gameManager.alerts, []);
                this.assert.strictEqual(gameManager.gameOver, false);
            }
        });
    }

}

module.exports.TestDoubleLoginSessions = TestDoubleLoginSessions;
