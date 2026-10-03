/**
 *
 * Reldens - Test Deleted Room Players Relocator
 *
 */

const { BaseTest } = require('./base-test');
const { DeletedRoomPlayersRelocator } = require('../lib/rooms/server/deleted-room-players-relocator');

class TestDeletedRoomPlayersRelocator extends BaseTest
{

    createPlayersStateRepository(appliedUpdates)
    {
        return {
            updateBy: async (field, value, updatePatch) => {
                appliedUpdates.push({field, value, updatePatch});
                return true;
            }
        };
    }

    createConfig(defaultRoomId, setDefaultEnabled)
    {
        return {
            getWithoutLogs: (path, defaultValue) => {
                if('server/rooms/deletion/setDefault' === path){
                    return setDefaultEnabled;
                }
                if(false === defaultRoomId){
                    return defaultValue;
                }
                return defaultRoomId;
            }
        };
    }

    createRelocator(defaultRoomId, appliedUpdates = [], setDefaultEnabled = true)
    {
        return new DeletedRoomPlayersRelocator(
            {getEntity: () => this.createPlayersStateRepository(appliedUpdates)},
            this.createConfig(defaultRoomId, setDefaultEnabled)
        );
    }

    async testDeletingTheDefaultRoomIsPrevented()
    {
        await this.test('deleting the default room is prevented', async () => {
            let deleteControl = {prevented: false, result: ''};
            let appliedUpdates = [];
            let relocator = this.createRelocator(4, appliedUpdates);
            await relocator.prevent({deleteControl, ids: ['4']});
            this.assert.strictEqual(deleteControl.prevented, true);
            this.assert.strictEqual(deleteControl.result, 'errorRoomDeleteIsDefault');
            this.assert.strictEqual(appliedUpdates.length, 0);
        });
    }

    async testDeletingTheDefaultRoomIsPreventedWithinASelection()
    {
        await this.test('deleting a selection that includes the default room is prevented', async () => {
            let deleteControl = {prevented: false, result: ''};
            let relocator = this.createRelocator(4);
            await relocator.prevent({deleteControl, ids: ['5', '4', '6']});
            this.assert.strictEqual(deleteControl.prevented, true);
            this.assert.strictEqual(deleteControl.result, 'errorRoomDeleteIsDefault');
        });
    }

    async testPlayerStatesAreNotTouchedByDefault()
    {
        await this.test('player states are left for the foreign key to unlink when setDefault is off', async () => {
            let deleteControl = {prevented: false, result: ''};
            let appliedUpdates = [];
            let relocator = this.createRelocator(4, appliedUpdates, false);
            await relocator.prevent({deleteControl, ids: ['5', '6']});
            this.assert.strictEqual(deleteControl.prevented, false);
            this.assert.strictEqual(appliedUpdates.length, 0);
        });
    }

    async testPlayerStatesAreRelocatedToTheDefaultRoom()
    {
        await this.test('player states in the deleted rooms are relocated when setDefault is on', async () => {
            let deleteControl = {prevented: false, result: ''};
            let appliedUpdates = [];
            let relocator = this.createRelocator(4, appliedUpdates);
            await relocator.prevent({deleteControl, ids: ['5', '6']});
            this.assert.strictEqual(deleteControl.prevented, false);
            this.assert.strictEqual(appliedUpdates.length, 2);
            this.assert.deepStrictEqual(
                [...appliedUpdates].shift(),
                {field: 'room_id', value: 5, updatePatch: {room_id: '4'}}
            );
        });
    }

    async testDeleteIsAllowedWithoutADefaultRoom()
    {
        await this.test('the delete is allowed and nothing is relocated when no default room is set', async () => {
            let deleteControl = {prevented: false, result: ''};
            let appliedUpdates = [];
            let relocator = this.createRelocator(false, appliedUpdates);
            await relocator.prevent({deleteControl, ids: ['5']});
            this.assert.strictEqual(deleteControl.prevented, false);
            this.assert.strictEqual(appliedUpdates.length, 0);
        });
    }

}

module.exports.TestDeletedRoomPlayersRelocator = TestDeletedRoomPlayersRelocator;
