/**
 *
 * Reldens - Test Room Chat Disconnection
 *
 */

const { BaseTest } = require('./base-test');
const { RoomChat } = require('../lib/chat/server/room-chat');
const { RoomGame } = require('../lib/rooms/server/game');
const { RoomScene } = require('../lib/rooms/server/scene');
const { ChatManager } = require('../lib/chat/server/manager');
const { UserDisconnection } = require('../lib/game/server/user-disconnection');
const { ActivePlayers } = require('../lib/game/server/memory/active-players');
const { SyncServerDriver } = require('../lib/sync/server/colyseus/sync-server-driver');
const { MessageFactory } = require('../lib/chat/message-factory');
const { ChatConst } = require('../lib/chat/constants');
const { GameConst } = require('../lib/game/constants');

class TestRoomChatDisconnection extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.userModel = {id: 1, username: 'root', role_id: 1, player: {id: 1, name: 'ImRoot', state: {room_id: 4}}};
        this.otherUserModel = {id: 2, username: 'other', role_id: 1, player: {id: 2, name: 'Other'}};
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
        let setup = {activePlayers: new ActivePlayers.constructor(), closedSessions: [], broadcasted: [], saved: []};
        setup.activePlayers.gameRoomInstanceId = 'game-room';
        setup.gameRoom = this.createRoom(RoomGame, 'game-room', setup);
        setup.chatRoom = this.createRoom(RoomChat, 'chat-room', setup);
        setup.chatRoom.config = {
            get: (path) => this.configValues[path],
            getWithoutLogs: (path, defaultValue) => this.configValues[path] ?? defaultValue
        };
        setup.chatRoom.broadcast = (type, message) => setup.broadcasted.push(message);
        setup.chatRoom.chatManager = new ChatManager({});
        setup.chatRoom.chatManager.saveMessage = async (...savedData) => setup.saved.push(savedData);
        return setup;
    }

    createRoom(roomClass, roomId, setup)
    {
        let room = Object.create(roomClass.prototype);
        room.roomId = roomId;
        room.roomName = roomId;
        room.loginManager = {activePlayers: setup.activePlayers};
        return room;
    }

    joinRoom(setup, room, sessionId, userModel)
    {
        let client = {sessionId, leave: (closeCode) => setup.closedSessions.push([sessionId, closeCode])};
        setup.activePlayers.add(userModel || this.userModel, client, room);
        return client;
    }

    hasChatSession(setup, sessionId)
    {
        return Boolean(setup.chatRoom.activePlayerBySessionId(sessionId, 'chat-room'));
    }

    createGlobalMessage()
    {
        return {[GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION, [ChatConst.MESSAGE.KEY]: '#hello everyone'};
    }

    async testTheEndedChatSessionIsRemovedAndClosedAsConsented()
    {
        await this.test('the ended chat session is removed and its connection closed as consented', async () => {
            let setup = this.createSessionsSetup();
            let endedClient = this.joinRoom(setup, setup.chatRoom, 'ended-session');
            this.assert.strictEqual(setup.chatRoom.disconnectBySessionId('ended-session', endedClient), true);
            this.assert.deepStrictEqual(setup.closedSessions, [['ended-session', this.consentedCode]]);
            this.assert.strictEqual(this.hasChatSession(setup, 'ended-session'), false);
            this.assert.strictEqual(setup.chatRoom.activePlayerByUserName('root', 'chat-room'), false);
            this.assert.strictEqual(setup.chatRoom.activePlayerByPlayerName('ImRoot', 'chat-room'), false);
            this.assert.deepStrictEqual(setup.activePlayers.playersSessionsByUserId[1], {});
        });
    }

    async testTheEndedChatSessionCanNotSendMessages()
    {
        await this.test('a global message sent by the ended chat session is not broadcast or saved', async () => {
            let globalMessage = MessageFactory.create(ChatConst.TYPES.GLOBAL, 'hello everyone', {}, 'ImRoot');
            for(let isDisconnected of [false, true]){
                let setup = this.createSessionsSetup();
                let endedClient = this.joinRoom(setup, setup.chatRoom, 'ended-session');
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
                let endedClient = this.joinRoom(setup, setup.chatRoom, 'ended-session');
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
            let endedClient = this.joinRoom(setup, setup.chatRoom, 'ended-session');
            let newClient = this.joinRoom(setup, setup.chatRoom, 'new-session');
            setup.chatRoom.disconnectBySessionId('ended-session', endedClient);
            this.assert.deepStrictEqual(setup.closedSessions, [['ended-session', this.consentedCode]]);
            this.assert.strictEqual(setup.chatRoom.activePlayerByUserName('root', 'chat-room').client, newClient);
            this.assert.strictEqual(setup.chatRoom.activePlayerByPlayerName('ImRoot', 'chat-room').client, newClient);
            this.assert.deepStrictEqual(setup.activePlayers.playersSessionsByUserId[1], {'new-session': 'chat-room'});
        });
    }

    createUserDisconnection(setup, sceneRoom)
    {
        return new UserDisconnection({
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            roomsManager: {
                createdInstances: {'game-room': setup.gameRoom, 'scene-room': sceneRoom, 'chat-room': setup.chatRoom}
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
                let sceneRoom = this.createRoom(RoomScene, 'scene-room', setup);
                sceneRoom.disconnectBySessionId = async (sessionId) => sceneDisconnections.push(sessionId);
                let gameClient = this.joinRoom(setup, setup.gameRoom, 'game-session');
                this.joinRoom(setup, sceneRoom, 'scene-session');
                this.joinRoom(setup, setup.chatRoom, 'chat-session');
                let otherClient = this.joinRoom(setup, setup.chatRoom, 'other-chat-session', this.otherUserModel);
                this.assert.strictEqual(
                    await this.createUserDisconnection(setup, sceneRoom).disconnectUserFromEveryRoom(
                        this.userModel,
                        avoidGameRoom
                    ),
                    true
                );
                this.assert.deepStrictEqual(sceneDisconnections, ['scene-session']);
                this.assert.deepStrictEqual(setup.closedSessions, [['chat-session', this.consentedCode]]);
                this.assert.strictEqual(
                    setup.activePlayers.fetchByRoomAndSessionId('game-session', 'game-room').client,
                    gameClient
                );
                this.assert.strictEqual(
                    setup.chatRoom.activePlayerByUserName('other', 'chat-room').client,
                    otherClient
                );
            }
        });
    }

}

module.exports.TestRoomChatDisconnection = TestRoomChatDisconnection;
