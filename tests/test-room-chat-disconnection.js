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
        setup.chatRoom.chatManager = new ChatManager({});
        setup.chatRoom.chatManager.saveMessage = async (...savedData) => setup.saved.push(savedData);
        return setup;
    }

    joinChat(setup, sessionId)
    {
        return ActiveSessionsBuilder.joinRoom(setup, setup.chatRoom, sessionId, this.userModel);
    }

    hasChatSession(setup, sessionId)
    {
        return Boolean(setup.chatRoom.activePlayerBySessionId(sessionId, ActiveSessionsBuilder.CHAT_ROOM_ID));
    }

    createGlobalMessage()
    {
        return {[GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION, [ChatConst.MESSAGE.KEY]: '#hello everyone'};
    }

    async testTheEndedChatSessionIsRemovedAndClosedAsConsented()
    {
        await this.test('the ended chat session is removed and its connection closed as consented', async () => {
            let setup = this.createSessionsSetup();
            let endedClient = this.joinChat(setup, 'ended-session');
            this.assert.strictEqual(setup.chatRoom.disconnectBySessionId('ended-session', endedClient), true);
            this.assert.deepStrictEqual(setup.closedSessions, [['ended-session', this.consentedCode]]);
            this.assert.strictEqual(this.hasChatSession(setup, 'ended-session'), false);
            this.assert.strictEqual(setup.chatRoom.activePlayerByUserName('root', ActiveSessionsBuilder.CHAT_ROOM_ID), false);
            this.assert.strictEqual(
                setup.chatRoom.activePlayerByPlayerName('ImRoot', ActiveSessionsBuilder.CHAT_ROOM_ID),
                false
            );
            this.assert.deepStrictEqual(ActiveSessionsBuilder.fetchUserSessions(setup, 1), []);
        });
    }

    async testTheEndedChatSessionCanNotSendMessages()
    {
        await this.test('a global message sent by the ended chat session is not broadcast or saved', async () => {
            let globalMessage = MessageFactory.create(ChatConst.TYPES.GLOBAL, 'hello everyone', {}, 'ImRoot');
            for(let isDisconnected of [false, true]){
                let setup = this.createSessionsSetup();
                let endedClient = this.joinChat(setup, 'ended-session');
                if(isDisconnected){
                    setup.chatRoom.disconnectBySessionId('ended-session', endedClient);
                }
                await setup.chatRoom.handleReceivedMessage(endedClient, this.createGlobalMessage());
                this.assert.deepStrictEqual(setup.broadcasted, isDisconnected ? [] : [globalMessage]);
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
                let setup = this.createSessionsSetup();
                let endedClient = this.joinChat(setup, 'ended-session');
                if(isDisconnected){
                    setup.chatRoom.disconnectBySessionId('ended-session', endedClient);
                }
                await setup.chatRoom.onLeave(endedClient, true);
                this.assert.deepStrictEqual(setup.broadcasted, isDisconnected ? [] : [leftMessage]);
                this.assert.strictEqual(this.hasChatSession(setup, 'ended-session'), false);
            }
        });
    }

    async testTheNewChatSessionIsKeptWhenTheEndedOneIsClosed()
    {
        await this.test('a new chat session of the same user is kept when the ended one is closed', async () => {
            let setup = this.createSessionsSetup();
            let endedClient = this.joinChat(setup, 'ended-session');
            let newClient = this.joinChat(setup, 'new-session');
            setup.chatRoom.disconnectBySessionId('ended-session', endedClient);
            this.assert.deepStrictEqual(setup.closedSessions, [['ended-session', this.consentedCode]]);
            this.assert.strictEqual(
                setup.chatRoom.activePlayerByUserName('root', ActiveSessionsBuilder.CHAT_ROOM_ID).client,
                newClient
            );
            this.assert.strictEqual(
                setup.chatRoom.activePlayerByPlayerName('ImRoot', ActiveSessionsBuilder.CHAT_ROOM_ID).client,
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
                    [ActiveSessionsBuilder.CHAT_ROOM_ID]: setup.chatRoom
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
                this.joinChat(setup, 'chat-session');
                let otherClient = ActiveSessionsBuilder.joinRoom(
                    setup,
                    setup.chatRoom,
                    'other-chat-session',
                    this.otherUserModel
                );
                this.assert.strictEqual(
                    await this.createUserDisconnection(setup).disconnectUserFromEveryRoom(this.userModel, avoidGameRoom),
                    true
                );
                this.assert.deepStrictEqual(sceneDisconnections, ['scene-session']);
                this.assert.deepStrictEqual(setup.closedSessions, [['chat-session', this.consentedCode]]);
                this.assert.strictEqual(
                    setup.activePlayers.fetchByRoomAndSessionId('game-session', ActiveSessionsBuilder.GAME_ROOM_ID).client,
                    gameClient
                );
                this.assert.strictEqual(
                    setup.chatRoom.activePlayerByUserName('other', ActiveSessionsBuilder.CHAT_ROOM_ID).client,
                    otherClient
                );
            }
        });
    }

}

module.exports.TestRoomChatDisconnection = TestRoomChatDisconnection;
