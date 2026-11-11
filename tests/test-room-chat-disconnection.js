/**
 *
 * Reldens - Test Room Chat Disconnection
 *
 */

const { BaseTest } = require('./base-test');
const { ActiveSessionsBuilder } = require('./fixtures/active-sessions-builder');
const { ChatManager } = require('../lib/chat/server/manager');
const { UserDisconnection } = require('../lib/game/server/user-disconnection');
const { SyncServerDriver } = require('../lib/sync/server/colyseus/sync-server-driver');
const { MessageFactory } = require('../lib/chat/message-factory');
const { ChatConst } = require('../lib/chat/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestRoomChatDisconnection extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.userModel = ActiveSessionsBuilder.createUserModel(1, 'root', 'ImRoot');
        this.otherUserModel = ActiveSessionsBuilder.createUserModel(2, 'other', 'Other');
        this.configValues = {
            'client/chat/messages/characterLimit': 100,
            'server/chat/messages/global_enabled': 1,
            'server/chat/messages/global_allowed_roles': '1',
            'server/chat/messages/broadcast_leave': true
        };
        this.consentedCode = SyncServerDriver.CloseCode.CONSENTED;
        this.chatRoomId = ActiveSessionsBuilder.CHAT_ROOM_ID;
        this.gameRoomId = ActiveSessionsBuilder.GAME_ROOM_ID;
        this.globalMessage = {
            [GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION,
            [ChatConst.MESSAGE.KEY]: '#hello everyone'
        };
    }

    createSessionsSetup()
    {
        let setup = ActiveSessionsBuilder.createSetup();
        setup.broadcasted = [];
        setup.saved = [];
        setup.chatRoom.config = {
            get: (path) => this.configValues[path],
            getWithoutLogs: (path, defaultValue) => this.configValues[path] ?? defaultValue
        };
        setup.chatRoom.broadcast = (type, message) => setup.broadcasted.push(message);
        setup.chatRoom.chatManager = new ChatManager({dataServer: {getEntity: () => ({})}});
        setup.chatRoom.chatManager.saveMessage = async (...savedData) => setup.saved.push(savedData);
        return setup;
    }

    createEndedSessionSetup(isDisconnected)
    {
        let setup = this.createSessionsSetup();
        setup.endedClient = ActiveSessionsBuilder.joinRoom(setup, setup.chatRoom, 'ended-session', this.userModel);
        if(isDisconnected){
            setup.chatRoom.disconnectBySessionId('ended-session', setup.endedClient);
        }
        return setup;
    }

    async testTheEndedChatSessionIsRemovedAndClosedAsConsented()
    {
        await this.test('the ended chat session is removed and its connection closed as consented', async () => {
            let setup = this.createSessionsSetup();
            let endedClient = ActiveSessionsBuilder.joinRoom(setup, setup.chatRoom, 'ended-session', this.userModel);
            this.assert.strictEqual(setup.chatRoom.disconnectBySessionId('ended-session', endedClient), true);
            this.assert.deepStrictEqual(setup.closedSessions, [['ended-session', this.consentedCode]]);
            this.assert.strictEqual(
                sc.hasOwn(setup.activePlayers.playersByRoomId[this.chatRoomId].bySessionId, 'ended-session'),
                false
            );
            this.assert.strictEqual(setup.chatRoom.activePlayerByUserName('root', this.chatRoomId), false);
            this.assert.strictEqual(setup.chatRoom.activePlayerByPlayerName('ImRoot', this.chatRoomId), false);
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), []);
        });
    }

    async testTheEndedChatSessionCanNotSendMessages()
    {
        await this.test('a global message sent by the ended chat session is not broadcast or saved', async () => {
            let broadcastMessage = MessageFactory.create(ChatConst.TYPES.GLOBAL, 'hello everyone', {}, 'ImRoot');
            for(let isDisconnected of [false, true]){
                let setup = this.createEndedSessionSetup(isDisconnected);
                await setup.chatRoom.handleReceivedMessage(setup.endedClient, this.globalMessage);
                this.assert.deepStrictEqual(setup.broadcasted, isDisconnected ? [] : [broadcastMessage]);
                this.assert.strictEqual(setup.saved.length, isDisconnected ? 0 : 1);
            }
        });
    }

    async testTheEndedChatSessionLeaveIsNotBroadcast()
    {
        await this.test('the chat leave of the ended session is not broadcast while a real leave is', async () => {
            let leftMessage = MessageFactory.create(
                ChatConst.TYPES.SYSTEM,
                ChatConst.SNIPPETS.LEFT_ROOM,
                {[ChatConst.MESSAGE.DATA.PLAYER_NAME]: 'ImRoot'}
            );
            for(let isDisconnected of [false, true]){
                let setup = this.createEndedSessionSetup(isDisconnected);
                await setup.chatRoom.onLeave(setup.endedClient, true);
                this.assert.deepStrictEqual(setup.broadcasted, isDisconnected ? [] : [leftMessage]);
                this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), []);
            }
        });
    }

    async testTheNewChatSessionIsKeptWhenTheEndedOneIsClosed()
    {
        await this.test('a new chat session of the same user is kept when the ended one is closed', async () => {
            let setup = this.createEndedSessionSetup(false);
            let newClient = ActiveSessionsBuilder.joinRoom(setup, setup.chatRoom, 'new-session', this.userModel);
            setup.chatRoom.disconnectBySessionId('ended-session', setup.endedClient);
            this.assert.deepStrictEqual(setup.closedSessions, [['ended-session', this.consentedCode]]);
            this.assert.strictEqual(setup.chatRoom.activePlayerByUserName('root', this.chatRoomId).client, newClient);
            this.assert.strictEqual(
                setup.chatRoom.activePlayerByPlayerName('ImRoot', this.chatRoomId).client,
                newClient
            );
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), ['new-session']);
        });
    }

    createUserDisconnection(setup)
    {
        return new UserDisconnection({
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            roomsManager: {
                createdInstances: {
                    [ActiveSessionsBuilder.GAME_ROOM_ID]: setup.gameRoom,
                    [ActiveSessionsBuilder.SCENE_ROOM_ID]: setup.sceneRoom,
                    [this.chatRoomId]: setup.chatRoom
                }
            },
            activePlayers: setup.activePlayers
        });
    }

    async testEveryRoomOfTheUserIsDisconnectedIncludingTheChat()
    {
        await this.test('user scene and chat sessions are disconnected, game and other users are kept', async () => {
            for(let avoidGameRoom of [true, false]){
                let setup = this.createSessionsSetup();
                let sceneDisconnections = [];
                setup.sceneRoom.disconnectBySessionId = async (sessionId) => sceneDisconnections.push(sessionId);
                let gameClient = ActiveSessionsBuilder.joinRoom(setup, setup.gameRoom, 'game-session', this.userModel);
                ActiveSessionsBuilder.joinRoom(setup, setup.sceneRoom, 'scene-session', this.userModel);
                ActiveSessionsBuilder.joinRoom(setup, setup.chatRoom, 'chat-session', this.userModel);
                let otherClient = ActiveSessionsBuilder.joinRoom(
                    setup,
                    setup.chatRoom,
                    'other-chat-session',
                    this.otherUserModel
                );
                let userDisconnection = this.createUserDisconnection(setup);
                this.assert.strictEqual(
                    await userDisconnection.disconnectUserFromEveryRoom(this.userModel, avoidGameRoom),
                    true
                );
                this.assert.deepStrictEqual(sceneDisconnections, ['scene-session']);
                this.assert.deepStrictEqual(setup.closedSessions, [['chat-session', this.consentedCode]]);
                this.assert.strictEqual(
                    setup.gameRoom.activePlayerBySessionId('game-session', this.gameRoomId, false).client,
                    gameClient
                );
                this.assert.strictEqual(
                    setup.chatRoom.activePlayerByUserName('other', this.chatRoomId).client,
                    otherClient
                );
            }
        });
    }

}

module.exports.TestRoomChatDisconnection = TestRoomChatDisconnection;
