/**
 *
 * Reldens - Test Chat Manager
 *
 */

const { BaseTest } = require('./base-test');
const { ChatManager } = require('../lib/chat/server/manager');
const { ChatConst } = require('../lib/chat/constants');

class TestChatManager extends BaseTest
{

    createEntry(capturedEntries, rejectRoomReference, entryData)
    {
        if(rejectRoomReference && entryData.room_id){
            return false;
        }
        capturedEntries.push(entryData);
        return entryData;
    }

    createChatRepository(capturedEntries, rejectRoomReference)
    {
        return {
            create: async (entryData) => this.createEntry(capturedEntries, rejectRoomReference, entryData)
        };
    }

    createChatManager(capturedEntries, rejectRoomReference = false)
    {
        return new ChatManager({
            dataServer: {getEntity: () => this.createChatRepository(capturedEntries, rejectRoomReference)}
        });
    }

    async testTheMessageIsSavedWithTheRoomReference()
    {
        await this.test('the message is saved with the room reference', async () => {
            let capturedEntries = [];
            let chatManager = this.createChatManager(capturedEntries);
            let saveResult = await chatManager.saveMessage('test message', 1, 24, null, ChatConst.TYPES.MESSAGE);
            this.assert.strictEqual(saveResult, true);
            this.assert.strictEqual(capturedEntries.length, 1);
            this.assert.strictEqual([...capturedEntries].shift().room_id, 24);
        });
    }

    async testTheMessageIsSavedWithoutAnInvalidRoomReference()
    {
        await this.test('the message is saved without the room reference when the room no longer exists', async () => {
            let capturedEntries = [];
            let chatManager = this.createChatManager(capturedEntries, true);
            let saveResult = await chatManager.saveMessage('test message', 1, 24, null, ChatConst.TYPES.MESSAGE);
            this.assert.strictEqual(saveResult, true);
            this.assert.strictEqual(capturedEntries.length, 1);
            let savedEntry = [...capturedEntries].shift();
            this.assert.strictEqual(false, Object.keys(savedEntry).includes('room_id'));
            this.assert.strictEqual(savedEntry.message, 'test message');
        });
    }

    async testTheMessageWithoutARoomIsSavedOnce()
    {
        await this.test('a message without a room is inserted a single time', async () => {
            let capturedEntries = [];
            let chatManager = this.createChatManager(capturedEntries, true);
            let saveResult = await chatManager.saveMessage('test message', 1, null, null, ChatConst.TYPES.MESSAGE);
            this.assert.strictEqual(saveResult, true);
            this.assert.strictEqual(capturedEntries.length, 1);
        });
    }

}

module.exports.TestChatManager = TestChatManager;
