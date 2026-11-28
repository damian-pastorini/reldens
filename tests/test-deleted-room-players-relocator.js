/**
 *
 * Reldens - Test Deleted Room Players Relocator
 *
 * Tests the player states of the rooms deleted from the administration panel, with the relocator events handled by a
 * listening PlayerStatesMover: the default room (alone or in a selection) can never be deleted; with setDefault on,
 * before the delete only the ids of the player states in the deleted rooms and the default room are kept on the delete
 * control (nothing is updated), and after the delete (called only for a succeeded delete) the relocation is requested
 * and they are moved to the default room; a load or update storage error is caught and moves nothing; with setDefault
 * off, or with no default room, nothing is loaded or moved.
 *
 */

const { BaseTest } = require('./base-test');
const { DeletedRoomPlayersRelocator } = require('../lib/rooms/server/deleted-room-players-relocator');
const { PlayerStatesMover } = require('../lib/users/server/player-states-mover');
const { sc } = require('@reldens/utils');

class TestDeletedRoomPlayersRelocator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.storedPlayerStates = [{id: 11, room_id: 5}, {id: 12, room_id: 6}, {id: 13, room_id: 7}];
    }

    createPlayersStateRepository(storageCalls, failedMethod)
    {
        return {
            load: async (filters) => {
                storageCalls.push({load: filters});
                return 'load' === failedMethod
                    ? Promise.reject({message: 'Storage.'})
                    : this.storedPlayerStates.filter(state => -1 !== filters.room_id.value.indexOf(state.room_id));
            },
            update: async (filters, updatePatch) => {
                storageCalls.push({update: filters, updatePatch});
                return 'update' === failedMethod ? Promise.reject({message: 'Storage.'}) : true;
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

    createRelocator(defaultRoomId, storageCalls = [], setDefaultEnabled = true, failedMethod = '')
    {
        let listeners = {};
        let events = {
            on: (eventName, callback) => listeners[eventName] = callback,
            emit: async (eventName, eventData) => sc.hasOwn(listeners, eventName) && await listeners[eventName](eventData)
        };
        new PlayerStatesMover({
            events,
            playerStateRepository: this.createPlayersStateRepository(storageCalls, failedMethod)
        }).listenEvents();
        return new DeletedRoomPlayersRelocator(events, this.createConfig(defaultRoomId, setDefaultEnabled));
    }

    async testDeletingTheDefaultRoomIsPrevented()
    {
        await this.test('deleting the default room is prevented', async () => {
            let deleteControl = {prevented: false, result: ''};
            let storageCalls = [];
            let relocator = this.createRelocator(4, storageCalls);
            await relocator.prevent({deleteControl, ids: ['4']});
            this.assert.deepStrictEqual(
                [deleteControl.prevented, deleteControl.result, storageCalls],
                [true, 'errorRoomDeleteIsDefault', []]
            );
        });
    }

    async testDeletingTheDefaultRoomIsPreventedWithinASelection()
    {
        await this.test('deleting a selection that includes the default room is prevented', async () => {
            let deleteControl = {prevented: false, result: ''};
            let relocator = this.createRelocator(4);
            await relocator.prevent({deleteControl, ids: ['5', '4', '6']});
            this.assert.deepStrictEqual(
                [deleteControl.prevented, deleteControl.result],
                [true, 'errorRoomDeleteIsDefault']
            );
        });
    }

    async testPlayerStatesAreNotTouchedByDefault()
    {
        await this.test('player states are left for the foreign key to unlink when setDefault is off', async () => {
            let deleteControl = {prevented: false, result: ''};
            let storageCalls = [];
            let relocator = this.createRelocator(4, storageCalls, false);
            await relocator.prevent({deleteControl, ids: ['5', '6']});
            let isRelocated = await relocator.relocateAfterDelete({deleteControl, deleteResult: true});
            this.assert.deepStrictEqual([deleteControl.prevented, isRelocated, storageCalls], [false, false, []]);
        });
    }

    async testOnlyTheDeletedRoomsPlayerStatesAreKeptBeforeTheDelete()
    {
        await this.test('before the delete only the ids of the deleted rooms player states are kept and nothing is updated', async () => {
            let deleteControl = {prevented: false, result: ''};
            let storageCalls = [];
            let relocator = this.createRelocator(4, storageCalls);
            await relocator.prevent({deleteControl, ids: ['5', '6']});
            this.assert.deepStrictEqual(
                [deleteControl.prevented, deleteControl.relocatedPlayerStatesIds, deleteControl.defaultRoomId, storageCalls],
                [false, [11, 12], '4', [{load: {room_id: {operator: 'IN', value: [5, 6]}}}]]
            );
        });
    }

    async testPlayerStatesAreRelocatedAfterTheDelete()
    {
        await this.test('the kept player states are moved to the default room after the delete, a storage error moves nothing and the relocation is still requested', async () => {
            let results = [];
            for(let failedMethod of ['', 'load', 'update']){
                let deleteControl = {prevented: false, result: ''};
                let storageCalls = [];
                let relocator = this.createRelocator(4, storageCalls, true, failedMethod);
                await relocator.prevent({deleteControl, ids: ['5', '6']});
                results.push([
                    deleteControl.relocatedPlayerStatesIds,
                    await relocator.relocateAfterDelete({deleteControl}),
                    storageCalls.filter(storageCall => storageCall.update)
                ]);
            }
            let movedUpdate = {update: {id: {operator: 'IN', value: [11, 12]}}, updatePatch: {room_id: '4'}};
            let isRelocationRequested = true;
            this.assert.deepStrictEqual(results, [
                [[11, 12], isRelocationRequested, [movedUpdate]],
                [[], isRelocationRequested, []],
                [[11, 12], isRelocationRequested, [movedUpdate]]
            ]);
        });
    }

    async testDeleteIsAllowedWithoutADefaultRoom()
    {
        await this.test('the delete is allowed and nothing is relocated when no default room is set', async () => {
            let deleteControl = {prevented: false, result: ''};
            let storageCalls = [];
            let relocator = this.createRelocator(false, storageCalls);
            await relocator.prevent({deleteControl, ids: ['5']});
            let isRelocated = await relocator.relocateAfterDelete({deleteControl, deleteResult: true});
            this.assert.deepStrictEqual([deleteControl.prevented, isRelocated, storageCalls], [false, false, []]);
        });
    }

}

module.exports.TestDeletedRoomPlayersRelocator = TestDeletedRoomPlayersRelocator;
