/**
 *
 * Reldens - Test Deleted Rooms Cross Server Close
 *
 */

const { BaseTest } = require('./base-test');
const { DeletedRoomsCrossServerClose } = require('../lib/rooms/server/deleted-rooms-cross-server-close');
const { RoomsPlugin } = require('../lib/rooms/server/plugin');
const { RoomsConst } = require('../lib/rooms/constants');
const { FetchStubRouteDispatcher } = require('./fixtures/fetch-stub-route-dispatcher');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');

class TestDeletedRoomsCrossServerClose extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.firstServerUrl = 'http://server-1:8080';
        this.secondServerUrl = 'http://server-2:8080';
        this.roomsServers = {town: this.firstServerUrl, house: this.secondServerUrl, forest: this.secondServerUrl};
    }

    createServerClose(serverSelfUrl, secret, closedRooms)
    {
        return new DeletedRoomsCrossServerClose(Object.assign(
            ServerMessengerPropsBuilder.create(serverSelfUrl, this.roomsServers, secret, RoomsConst.SYNC.ROUTE),
            {deletedRoomCloser: {closeRooms: async (roomIds) => 0 < closedRooms.push(roomIds)}}
        ));
    }

    async sendFromTheFirstServer(firstSecret, secondSecret)
    {
        let closedRooms = {first: [], second: []};
        let firstServer = this.createServerClose(this.firstServerUrl, firstSecret, closedRooms.first);
        let secondServer = this.createServerClose(this.secondServerUrl, secondSecret, closedRooms.second);
        let responses = [];
        await FetchStubRouteDispatcher.withServers(
            {[this.firstServerUrl]: firstServer, [this.secondServerUrl]: secondServer},
            async () => responses = await firstServer.sendDeletedRooms([4, 5])
        );
        return {closedRooms, responses};
    }

    async testTheDeletedRoomsAreClosedOnEveryOtherServerOnce()
    {
        await this.test('the deleted rooms are sent once to every other server and closed there, never on the sender', async () => {
            let sent = await this.sendFromTheFirstServer('shared-secret', 'shared-secret');
            this.assert.deepStrictEqual(sent.closedRooms, {first: [], second: [[4, 5]]});
            this.assert.deepStrictEqual(sent.responses, [{serverUrl: this.secondServerUrl, response: {isSuccess: true}}]);
        });
    }

    async testARequestSignedWithAnotherSecretClosesNothing()
    {
        await this.test('a deleted rooms request signed with another secret closes nothing and counts as not sent', async () => {
            let sent = await this.sendFromTheFirstServer('first-secret', 'second-secret');
            this.assert.deepStrictEqual(sent.closedRooms, {first: [], second: []});
            this.assert.deepStrictEqual(sent.responses, [{serverUrl: this.secondServerUrl, response: false}]);
        });
    }

    async testAnUnknownActionClosesNothing()
    {
        await this.test('an unknown rooms sync action closes nothing', async () => {
            let closedRooms = [];
            let serverClose = this.createServerClose(this.secondServerUrl, 'shared-secret', closedRooms);
            this.assert.deepStrictEqual(
                [await serverClose.receiveAction('removeEverything', RoomsConst.SYNC.DELETED_ROOMS_TARGET, {roomIds: [4]}), closedRooms],
                [{isSuccess: false}, []]
            );
        });
    }

    async testOnlyASuccessfulRoomsDeleteIsSentToTheOtherServers()
    {
        await this.test('only a successful rooms delete is sent to the other servers, a missing result counts as failed', async () => {
            let roomsPlugin = new RoomsPlugin();
            let sentRoomIds = [];
            let deleteEvents = [
                {driverResource: {id: () => 'rooms'}, ids: [4], deleteResult: 1},
                {driverResource: {id: () => 'rooms'}, ids: [5], deleteResult: false},
                {driverResource: {id: () => 'objects'}, ids: [6], deleteResult: 1},
                {driverResource: {id: () => 'rooms'}, ids: [7]}
            ];
            let results = [await roomsPlugin.sendDeletedRoomsToOtherServers(deleteEvents[0])];
            roomsPlugin.deletedRoomsCrossServerClose = {
                sendDeletedRooms: async (roomIds) => sentRoomIds.push(roomIds) && [{serverUrl: this.secondServerUrl, response: false}]
            };
            for(let deleteEvent of deleteEvents){
                results.push(await roomsPlugin.sendDeletedRoomsToOtherServers(deleteEvent));
            }
            this.assert.deepStrictEqual([results, sentRoomIds], [[false, true, false, false, false], [[4]]]);
        });
    }

    async testTheRoomsPluginListensOnlyWithItsEventsAndConfig()
    {
        await this.test('the rooms plugin listens to nothing without its events or config', async () => {
            let listenedEvents = [];
            let results = [];
            for(let props of [{config: {}}, {events: {on: (eventKey) => listenedEvents.push(eventKey)}}]){
                let roomsPlugin = new RoomsPlugin();
                await roomsPlugin.setup(props);
                results.push(roomsPlugin.listenEvents());
            }
            this.assert.deepStrictEqual([results, listenedEvents], [[false, false], []]);
        });
    }

}

module.exports.TestDeletedRoomsCrossServerClose = TestDeletedRoomsCrossServerClose;
