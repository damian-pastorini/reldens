/**
 *
 * Reldens - Test Rooms Availability
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsAvailability } = require('../lib/game/server/health/rooms-availability');
const { GameConst } = require('../lib/game/constants');

class TestRoomsAvailability extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.selfServerUrl = 'http://localhost:8080';
        this.remoteServerUrl = 'http://localhost:8090';
        this.roomsServers = {
            'reldens-town': this.selfServerUrl,
            'reldens-bots-forest': this.selfServerUrl,
            'reldens-forest': this.remoteServerUrl
        };
    }

    createRoomsAvailability(isBlocking, createdRooms, remoteStatus, requestedServers = [], blockingEnabled = true)
    {
        return new RoomsAvailability({
            serverHealthMonitor: {blockingEnabled, isBlocking, usageReport: {isBlocking}},
            remoteServersStatus: {
                fetchStatus: async (serverUrl) => {
                    requestedServers.push(serverUrl);
                    return remoteStatus;
                }
            },
            isRoomCreated: (roomName) => -1 !== createdRooms.indexOf(roomName),
            roomsServers: this.roomsServers,
            serverSelfUrls: [this.selfServerUrl, '']
        });
    }

    async testTheLocalRoomIsAvailableWhenTheServerIsNotOverloaded()
    {
        await this.test('a not created room of this server is available while the server is not overloaded', async () => {
            let roomsAvailability = this.createRoomsAvailability(false, [], false);
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomAvailability('reldens-bots-forest'),
                {isAvailable: true, reason: ''}
            );
        });
    }

    async testTheNotCreatedLocalRoomIsNotAvailableWhileOverloaded()
    {
        await this.test('a not created room of this server is not available while the server is overloaded', async () => {
            let roomsAvailability = this.createRoomsAvailability(true, ['reldens-town'], false);
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomAvailability('reldens-bots-forest'),
                {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY}
            );
        });
    }

    async testTheCreatedLocalRoomIsAvailableWhileOverloaded()
    {
        await this.test('an already created room of this server is available while the server is overloaded', async () => {
            let roomsAvailability = this.createRoomsAvailability(true, ['reldens-town'], false);
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomAvailability('reldens-town'),
                {isAvailable: true, reason: ''}
            );
        });
    }

    async testTheRoomOfAnOverloadedRemoteServerIsNotAvailable()
    {
        await this.test('a room of another overloaded server is not available', async () => {
            let roomsAvailability = this.createRoomsAvailability(false, [], {
                isReachable: true,
                usageReport: {isBlocking: true}
            });
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomAvailability('reldens-forest'),
                {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY}
            );
        });
    }

    async testTheRoomOfAnUnreachableRemoteServerIsNotAvailable()
    {
        await this.test('a room of another server that does not answer its status is not available', async () => {
            let roomsAvailability = this.createRoomsAvailability(false, [], {isReachable: false, usageReport: false});
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomAvailability('reldens-forest'),
                {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE}
            );
        });
    }

    async testTheRoomOfAnAvailableRemoteServerIsAvailable()
    {
        await this.test('a room of another server that is not overloaded is available', async () => {
            let roomsAvailability = this.createRoomsAvailability(true, [], {
                isReachable: true,
                usageReport: {isBlocking: false}
            });
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomAvailability('reldens-forest'),
                {isAvailable: true, reason: ''}
            );
        });
    }

    async testEveryRoomIsAvailableWithTheBlockingDisabled()
    {
        await this.test('with the blocking disabled every room is available and no other server is requested', async () => {
            let requestedServers = [];
            let roomsAvailability = this.createRoomsAvailability(
                false,
                [],
                {isReachable: false, usageReport: false},
                requestedServers,
                false
            );
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomsAvailability(['reldens-bots-forest', 'reldens-forest']),
                {
                    'reldens-bots-forest': {isAvailable: true, reason: ''},
                    'reldens-forest': {isAvailable: true, reason: ''}
                }
            );
            this.assert.strictEqual(requestedServers.length, 0);
        });
    }

    createRecordingRemoteStatus(statusRequests)
    {
        return {
            fetchStatus: async (serverUrl) => {
                statusRequests.started.push(serverUrl);
                await Promise.resolve();
                statusRequests.startedWhenAnswered.push(statusRequests.started.length);
                return {isReachable: false, usageReport: false};
            }
        };
    }

    async testTheRoomsOfDifferentServersAreRequestedTogether()
    {
        await this.test('the availability of rooms of different servers is requested at the same time', async () => {
            let statusRequests = {started: [], startedWhenAnswered: []};
            let roomsAvailability = new RoomsAvailability({
                serverHealthMonitor: {blockingEnabled: true, isBlocking: false, usageReport: {isBlocking: false}},
                remoteServersStatus: this.createRecordingRemoteStatus(statusRequests),
                isRoomCreated: () => false,
                roomsServers: {'reldens-forest': this.remoteServerUrl, 'reldens-desert': 'http://localhost:8100'},
                serverSelfUrls: [this.selfServerUrl]
            });
            let unreachableRoom = {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE};
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomsAvailability(['reldens-forest', 'reldens-desert']),
                {'reldens-forest': unreachableRoom, 'reldens-desert': unreachableRoom}
            );
            this.assert.deepStrictEqual(statusRequests.started, [this.remoteServerUrl, 'http://localhost:8100']);
            this.assert.deepStrictEqual(statusRequests.startedWhenAnswered, [2, 2]);
        });
    }

    async testTheServersStatusesListThisServerAndEachRemoteServerOnce()
    {
        await this.test('the servers statuses list this server first and every other server once', async () => {
            let remoteStatus = {
                serverUrl: this.remoteServerUrl,
                isSelf: false,
                isReachable: true,
                latencyMs: 45,
                usageReport: {isBlocking: false},
                error: ''
            };
            let roomsAvailability = this.createRoomsAvailability(false, [], remoteStatus);
            let serversStatuses = await roomsAvailability.fetchServersStatuses();
            this.assert.deepStrictEqual(roomsAvailability.remoteServersUrls, [this.remoteServerUrl]);
            this.assert.deepStrictEqual(serversStatuses, [
                {
                    serverUrl: this.selfServerUrl,
                    isSelf: true,
                    isReachable: true,
                    latencyMs: 0,
                    usageReport: {isBlocking: false},
                    error: ''
                },
                remoteStatus
            ]);
        });
    }

}

module.exports.TestRoomsAvailability = TestRoomsAvailability;
