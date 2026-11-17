/**
 *
 * Reldens - Test Sync Room Leave Code
 *
 * Tests the Colyseus Room wrapper (lib/sync/server/colyseus/room.js): a room subclass onLeave receives the Colyseus
 * leave code translated to the legacy consented flag, true only for the consented close code and false for an
 * abnormal close, a server shutdown or an error close.
 *
 */

const { BaseTest } = require('./base-test');
const { Room } = require('../lib/sync/server/colyseus/room');
const { SyncServerDriver } = require('../lib/sync/server/colyseus/sync-server-driver');

class LeaveRecordingRoom extends Room
{

    async onLeave(client, consented)
    {
        this.leaves.push([client.sessionId, consented]);
    }

}

class TestSyncRoomLeaveCode extends BaseTest
{

    async testTheLeaveCodeIsTranslatedToTheConsentedFlag()
    {
        await this.test('the room onLeave gets consented true only for the consented close code', async () => {
            let room = new LeaveRecordingRoom();
            room.leaves = [];
            let closeCodes = SyncServerDriver.CloseCode;
            await room.onLeave({sessionId: 'consented'}, closeCodes.CONSENTED);
            await room.onLeave({sessionId: 'abnormal'}, 1006);
            await room.onLeave({sessionId: 'shutdown'}, closeCodes.SERVER_SHUTDOWN);
            await room.onLeave({sessionId: 'error'}, closeCodes.WITH_ERROR);
            this.assert.deepStrictEqual(room.leaves, [
                ['consented', true],
                ['abnormal', false],
                ['shutdown', false],
                ['error', false]
            ]);
        });
    }

}

module.exports.TestSyncRoomLeaveCode = TestSyncRoomLeaveCode;
