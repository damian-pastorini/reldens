/**
 *
 * Reldens - Test Chat Messages Throttle
 *
 */

const { BaseTest } = require('./base-test');
const { MessagesGuard } = require('../lib/chat/server/messages-guard');
const { RoomChat } = require('../lib/chat/server/room-chat');
const { ChatConst } = require('../lib/chat/constants');
const { GameConst } = require('../lib/game/constants');

class TestChatMessagesThrottle extends BaseTest
{

    createChatMessage(messageText)
    {
        return {[GameConst.ACTION_KEY]: ChatConst.CHAT_ACTION, [ChatConst.MESSAGE.KEY]: messageText};
    }

    async testGuardRejectsNonStringMessage()
    {
        await this.test('the messages guard rejects a non-string message without throwing', async () => {
            this.assert.strictEqual(MessagesGuard.validate(this.createChatMessage(5)), false);
            this.assert.strictEqual(MessagesGuard.validate(this.createChatMessage('hello')), true);
        });
    }

    async testRoomChatIgnoresInvalidMessages()
    {
        await this.test('the chat room ignores null data and non-string messages without throwing', async () => {
            let roomChat = Object.create(RoomChat.prototype);
            let fetchedPlayers = [];
            roomChat.activePlayerBySessionId = (sessionId) => fetchedPlayers.push(sessionId);
            let client = {sessionId: 'session-a'};
            await roomChat.handleReceivedMessage(client, null);
            await roomChat.handleReceivedMessage(client, this.createChatMessage(5));
            this.assert.strictEqual(fetchedPlayers.length, 0);
        });
    }

}

module.exports.TestChatMessagesThrottle = TestChatMessagesThrottle;
