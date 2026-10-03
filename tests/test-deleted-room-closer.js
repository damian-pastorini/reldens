/**
 *
 * Reldens - Test Deleted Room Closer
 *
 */

const { BaseTest } = require('./base-test');
const { DeletedRoomCloser } = require('../lib/rooms/server/deleted-room-closer');
const { RoomsManager } = require('../lib/rooms/server/manager');
const { RoomsConst } = require('../lib/rooms/constants');
const { ChatConst } = require('../lib/chat/constants');

class TestDeletedRoomCloser extends BaseTest
{

    createFakeConfig(closeSeconds, closeEnabled)
    {
        return {
            get: (path, defaultValue) => defaultValue,
            getWithoutLogs: (path, defaultValue) => {
                if('server/rooms/deletion/closeActiveRoomsSeconds' === path){
                    return closeSeconds;
                }
                if('server/rooms/deletion/closeActiveRoomsEnabled' === path){
                    return closeEnabled;
                }
                return defaultValue;
            }
        };
    }

    createCloserSetup(closeSeconds, closeEnabled)
    {
        let closerSetup = {sceneBroadcasts: [], gameBroadcasts: [], closeState: {disconnected: false}};
        closerSetup.fakeConfig = this.createFakeConfig(closeSeconds, closeEnabled);
        closerSetup.roomsManager = new RoomsManager({
            events: {emit: async () => true, on: () => true, emitSync: () => true},
            dataServer: {getEntity: () => ({})},
            config: closerSetup.fakeConfig
        });
        let roomModel = {roomId: 5, roomName: 'test-deleted-room', roomTitle: 'Test Deleted Room'};
        closerSetup.roomsManager.loadedRooms = [roomModel];
        closerSetup.roomsManager.loadedRoomsById = {5: roomModel};
        closerSetup.roomsManager.loadedRoomsByName = {'test-deleted-room': roomModel};
        closerSetup.roomsManager.availableRoomsGuest = {'test-deleted-room': roomModel};
        closerSetup.roomsManager.definedRooms = {'test-deleted-room': {}};
        closerSetup.roomsManager.registrationAvailableRooms = [
            {name: 'test-deleted-room', title: 'Test Deleted Room'}
        ];
        closerSetup.roomsManager.registrationAvailableRoomsGuest = [
            {name: 'test-deleted-room', title: 'Test Deleted Room'}
        ];
        closerSetup.roomsManager.loginAvailableRooms = [
            {name: 'test-deleted-room', title: 'Test Deleted Room'},
            {name: 'other-room', title: 'Other Room'}
        ];
        closerSetup.roomsManager.loginAvailableRoomsGuest = [];
        closerSetup.roomsManager.instanceIdByName = {'test-deleted-room': 'colyseusId2'};
        closerSetup.roomsManager.createdInstances = {
            colyseusId1: {
                roomType: RoomsConst.ROOM_TYPE_GAME,
                broadcast: (key, message) => closerSetup.gameBroadcasts.push(message)
            },
            colyseusId2: {
                roomType: RoomsConst.ROOM_TYPE_SCENE,
                roomData: roomModel,
                roomName: 'test-deleted-room',
                clients: [{sessionId: 'clientA'}],
                broadcast: (key, message) => closerSetup.sceneBroadcasts.push(message),
                disconnect: async () => {
                    closerSetup.closeState.disconnected = true;
                    return true;
                },
                playersCountInState: () => 2
            }
        };
        closerSetup.deletedRoomCloser = new DeletedRoomCloser({
            roomsManager: closerSetup.roomsManager,
            config: closerSetup.fakeConfig
        });
        return closerSetup;
    }

    async testCloseRoomPurgesManagerListsAndSchedulesClose()
    {
        await this.test('closeRoom purges the manager lists, notifies and schedules the close', async () => {
            let closerSetup = this.createCloserSetup(10, true);
            await closerSetup.deletedRoomCloser.closeRooms(['5']);
            this.assert.strictEqual(closerSetup.roomsManager.isRoomLoaded(5), false);
            this.assert.strictEqual(closerSetup.roomsManager.loadedRooms.length, 0);
            this.assert.strictEqual(Object.keys(closerSetup.roomsManager.loadedRoomsById).length, 0);
            this.assert.strictEqual(Object.keys(closerSetup.roomsManager.loadedRoomsByName).length, 0);
            this.assert.strictEqual(Object.keys(closerSetup.roomsManager.availableRoomsGuest).length, 0);
            this.assert.strictEqual(Object.keys(closerSetup.roomsManager.definedRooms).length, 0);
            this.assert.strictEqual(closerSetup.roomsManager.registrationAvailableRooms.length, 0);
            this.assert.strictEqual(closerSetup.roomsManager.loginAvailableRooms.length, 1);
            this.assert.strictEqual([...closerSetup.roomsManager.loginAvailableRooms].shift().name, 'other-room');
            this.assert.strictEqual(closerSetup.gameBroadcasts.length, 1);
            this.assert.strictEqual([...closerSetup.gameBroadcasts].shift().act, RoomsConst.ROOM_REMOVED);
            this.assert.strictEqual(closerSetup.sceneBroadcasts.length, 2);
            this.assert.strictEqual([...closerSetup.sceneBroadcasts].shift().act, RoomsConst.ROOM_CLOSING);
            this.assert.strictEqual([...closerSetup.sceneBroadcasts].pop().ctk, ChatConst.TYPES.ERROR);
            this.assert.strictEqual([...closerSetup.sceneBroadcasts].pop().md.sec, 10);
            this.assert.strictEqual(Object.keys(closerSetup.deletedRoomCloser.closeTimers).length, 1);
            clearInterval(closerSetup.deletedRoomCloser.closeTimers[5]);
        });
    }

    async testDisconnectRoomInstanceClosesAndCleansTheRegistry()
    {
        await this.test('disconnectRoomInstance closes the live instance and cleans the registry', async () => {
            let closerSetup = this.createCloserSetup(10, true);
            let roomInstance = closerSetup.roomsManager.createdInstances.colyseusId2;
            let disconnectResult = await closerSetup.deletedRoomCloser.disconnectRoomInstance(
                roomInstance,
                5,
                'test-deleted-room'
            );
            this.assert.strictEqual(disconnectResult, true);
            this.assert.strictEqual(closerSetup.closeState.disconnected, true);
            this.assert.strictEqual(Object.keys(closerSetup.roomsManager.instanceIdByName).length, 0);
        });
    }

    async testCloseRoomKeepsInstanceWhenBehaviorIsDisabled()
    {
        await this.test('closeRoom keeps the live instance when the close behavior is disabled', async () => {
            let closerSetup = this.createCloserSetup(10, false);
            await closerSetup.deletedRoomCloser.closeRooms([5]);
            this.assert.strictEqual(closerSetup.roomsManager.isRoomLoaded(5), false);
            this.assert.strictEqual(closerSetup.roomsManager.loadedRooms.length, 0);
            this.assert.strictEqual(closerSetup.sceneBroadcasts.length, 0);
            this.assert.strictEqual(Object.keys(closerSetup.deletedRoomCloser.closeTimers).length, 0);
            this.assert.strictEqual(closerSetup.closeState.disconnected, false);
        });
    }

    async testClosingCountdownBroadcastsTheRemainingSeconds()
    {
        await this.test('the closing countdown broadcasts the remaining seconds to the players', async () => {
            let closerSetup = this.createCloserSetup(10, true);
            let roomInstance = closerSetup.roomsManager.createdInstances.colyseusId2;
            let broadcastResult = closerSetup.deletedRoomCloser.broadcastClosingCountdown(roomInstance, 3);
            this.assert.strictEqual(broadcastResult, true);
            this.assert.strictEqual(closerSetup.sceneBroadcasts.length, 1);
            let closingMessage = [...closerSetup.sceneBroadcasts].shift();
            this.assert.strictEqual(closingMessage.m, ChatConst.SNIPPETS.ROOM_CLOSING);
            this.assert.strictEqual(closingMessage.md.sec, 3);
        });
    }

    async testClosingCountdownIsSkippedOnAnEmptyRoom()
    {
        await this.test('the closing countdown does not broadcast when the room has no clients left', async () => {
            let closerSetup = this.createCloserSetup(10, true);
            let roomInstance = closerSetup.roomsManager.createdInstances.colyseusId2;
            roomInstance.clients = [];
            let broadcastResult = closerSetup.deletedRoomCloser.broadcastClosingCountdown(roomInstance, 3);
            this.assert.strictEqual(broadcastResult, false);
            this.assert.strictEqual(closerSetup.sceneBroadcasts.length, 0);
        });
    }

    async testCloseRoomsIgnoresAnEmptyIdsList()
    {
        await this.test('closeRooms does nothing when the deleted ids list is empty', async () => {
            let closerSetup = this.createCloserSetup(10, true);
            let closeResult = await closerSetup.deletedRoomCloser.closeRooms([]);
            this.assert.strictEqual(closeResult, false);
            this.assert.strictEqual(closerSetup.roomsManager.isRoomLoaded(5), true);
            this.assert.strictEqual(closerSetup.roomsManager.loadedRooms.length, 1);
        });
    }

    async testFindCreatedInstanceByRoomId()
    {
        await this.test('RoomsManager.findRoomInstanceById matches the database room ID', async () => {
            let closerSetup = this.createCloserSetup(10, true);
            let foundInstance = closerSetup.roomsManager.findRoomInstanceById(5);
            this.assert.strictEqual(foundInstance.roomName, 'test-deleted-room');
            this.assert.strictEqual(closerSetup.roomsManager.findRoomInstanceById(99), false);
        });
    }

}

module.exports.TestDeletedRoomCloser = TestDeletedRoomCloser;
