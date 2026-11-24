/**
 *
 * Reldens - Test Room Chat Global Messages
 *
 * The private messages relayed between the chat servers are tested in TestPrivateMessageCrossServerRelay.
 *
 */

const { BaseTest } = require('./base-test');
const { RoomChat } = require('../lib/chat/server/room-chat');
const { ChatConst } = require('../lib/chat/constants');
const { MessageFactory } = require('../lib/chat/message-factory');
const { TranslationsMapper } = require('../lib/snippets/client/translations-mapper');
const ChatTranslations = require('../lib/chat/client/snippets/en_US');
const { sc } = require('@reldens/utils');

class TestRoomChatGlobalMessages extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.basicConfigValues = {
            'server/chat/messages/global_enabled': 1,
            'server/chat/messages/global_allowed_roles': '1,99,9000'
        };
    }

    async sendGlobalMessage(configValues, roleId)
    {
        let roomCaptures = {broadcasted: [], saved: [], sent: []};
        let chatRoom = {
            config: {get: (path) => configValues[path]},
            broadcast: (type, message) => roomCaptures.broadcasted.push(message),
            chatManager: {saveMessage: async (...savedData) => roomCaptures.saved.push(savedData)}
        };
        await RoomChat.prototype.sendGlobalMessage.call(
            chatRoom,
            {send: (type, message) => roomCaptures.sent.push(message)},
            '#hello everyone',
            {roleId, playerName: 'ImRoot', playerId: 1, playerData: {state: {room_id: 4}}}
        );
        return roomCaptures;
    }

    async testTheAdminRoleBroadcastsAndSavesTheGlobalMessage()
    {
        await this.test('the default administration role broadcasts and saves the global message', async () => {
            let roomCaptures = await this.sendGlobalMessage(this.basicConfigValues, 99);
            this.assert.deepStrictEqual(
                roomCaptures.broadcasted,
                [MessageFactory.create(ChatConst.TYPES.GLOBAL, 'hello everyone', {}, 'ImRoot')]
            );
            this.assert.deepStrictEqual(roomCaptures.saved, [['hello everyone', 1, 4, false, ChatConst.TYPES.GLOBAL]]);
            this.assert.deepStrictEqual(roomCaptures.sent, []);
        });
    }

    async testANotAllowedRoleGetsThePermissionDenied()
    {
        await this.test('a role that is not allowed gets the global message permission denied', async () => {
            let roomCaptures = await this.sendGlobalMessage(this.basicConfigValues, 2);
            this.assert.deepStrictEqual(
                roomCaptures.sent,
                [MessageFactory.create(ChatConst.TYPES.ERROR, ChatConst.SNIPPETS.GLOBAL_MESSAGE_PERMISSION_DENIED)]
            );
            this.assert.deepStrictEqual(roomCaptures.broadcasted, []);
        });
    }

    async testTheDisabledGlobalMessagesAreNotAllowed()
    {
        await this.test('with the global messages disabled the user gets the not allowed message', async () => {
            let configValues = Object.assign({}, this.basicConfigValues, {'server/chat/messages/global_enabled': 0});
            let roomCaptures = await this.sendGlobalMessage(configValues, 99);
            this.assert.deepStrictEqual(
                roomCaptures.sent,
                [MessageFactory.create(ChatConst.TYPES.ERROR, ChatConst.SNIPPETS.GLOBAL_MESSAGE_NOT_ALLOWED)]
            );
            this.assert.deepStrictEqual(roomCaptures.broadcasted, []);
        });
    }

    async testPrivateMessageWithoutSpaceIsDropped()
    {
        await this.test('a private message with no space after the recipient name is dropped, with the space it is sent', async () => {
            let deliveries = [];
            let chatRoom = {
                roomId: 'chat-room',
                config: {get: () => 0, getWithoutLogs: (path, defaultValue) => defaultValue},
                activePlayerBySessionId: () => ({playerId: 1, playerName: 'ImRoot'}),
                chatManager: {isAllowedByCooldown: () => true},
                sendPrivateMessage: async (client, toPlayer, text) => deliveries.push([toPlayer, text])
            };
            for(let text of ['@ImRoot2hello', '@ImRoot2 hello']){
                await RoomChat.prototype.handleReceivedMessage.call(
                    chatRoom,
                    {sessionId: 'session-1'},
                    {act: ChatConst.CHAT_ACTION, [ChatConst.MESSAGE.KEY]: text, [ChatConst.CHAT_TO]: 'ImRoot2'}
                );
            }
            this.assert.deepStrictEqual(deliveries, [['ImRoot2', '@ImRoot2 hello']]);
        });
    }

    async testEveryChatSnippetHasAClientTranslation()
    {
        await this.test('every chat snippet key sent by the server has a client translation', async () => {
            let mappedTranslations = TranslationsMapper.fromObject(ChatTranslations);
            let serverSnippets = TranslationsMapper.fromObject(ChatConst.SNIPPETS);
            let missingKeys = Object.keys(serverSnippets).map((constantKey) => serverSnippets[constantKey]).filter(
                (snippetKey) => snippetKey.startsWith(ChatConst.SNIPPETS.PREFIX)
                    && ChatConst.SNIPPETS.PREFIX !== snippetKey
                    && !sc.hasOwn(mappedTranslations, snippetKey)
            );
            this.assert.deepStrictEqual(missingKeys, []);
        });
    }

}

module.exports.TestRoomChatGlobalMessages = TestRoomChatGlobalMessages;
