/**
 *
 * Reldens - Test Rooms Availability
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsAvailability } = require('../lib/game/server/health/rooms-availability');
const { RemoteServersStatus } = require('../lib/game/server/health/remote-servers-status');
const { ServerMessengerPropsBuilder } = require('./fixtures/server-messenger-props-builder');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');

class TestRoomsAvailability extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.selfServerUrl = 'http://localhost:8080';
        this.remoteServerUrl = 'http://localhost:8090';
        this.secondRemoteServerUrl = 'http://localhost:8100';
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
                },
                fetchStatuses: RemoteServersStatus.prototype.fetchStatuses
            },
            roomsUsageCollector: {fetchActiveUsersKeys: () => []},
            isRoomCreated: (roomName) => -1 !== createdRooms.indexOf(roomName),
            serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared(this.selfServerUrl, this.roomsServers, '')
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

    async testTheKnownRepeatedAndEmptyRoomsAreNotRequested()
    {
        await this.test('the known, repeated and empty rooms names are not requested again', async () => {
            let requestedServers = [];
            let roomsAvailability = this.createRoomsAvailability(
                false,
                [],
                {isReachable: true, usageReport: {isBlocking: false}},
                requestedServers
            );
            let knownRoomsAvailability = {'reldens-town': {isAvailable: false, reason: 'known'}};
            let fetchedRoomsAvailability = await roomsAvailability.fetchRoomsAvailability(
                ['reldens-town', 'reldens-forest', '', 'reldens-forest'],
                knownRoomsAvailability
            );
            this.assert.strictEqual(fetchedRoomsAvailability, knownRoomsAvailability);
            this.assert.deepStrictEqual(fetchedRoomsAvailability, {
                'reldens-town': {isAvailable: false, reason: 'known'},
                'reldens-forest': {isAvailable: true, reason: ''}
            });
            this.assert.deepStrictEqual(requestedServers, [this.remoteServerUrl]);
        });
    }

    async testTheRoomsOfOneServerRequestItsStatusOnce()
    {
        await this.test('the rooms of one other server request its status once and the local rooms none', async () => {
            let requestedServers = [];
            let roomsAvailability = this.createRoomsAvailability(
                true,
                [],
                {isReachable: true, usageReport: {isBlocking: false}},
                requestedServers
            );
            roomsAvailability.roomsServers['reldens-lake'] = this.remoteServerUrl;
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomsAvailability(['reldens-forest', 'reldens-bots-forest', 'reldens-lake']),
                {
                    'reldens-forest': {isAvailable: true, reason: ''},
                    'reldens-bots-forest': {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_BUSY},
                    'reldens-lake': {isAvailable: true, reason: ''}
                }
            );
            this.assert.deepStrictEqual(requestedServers, [this.remoteServerUrl]);
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
            },
            fetchStatuses: RemoteServersStatus.prototype.fetchStatuses
        };
    }

    async testTheRoomsOfDifferentServersAreRequestedTogether()
    {
        await this.test('the availability of rooms of different servers is requested from every server before any answer', async () => {
            let statusRequests = {started: [], startedWhenAnswered: []};
            let roomsAvailability = new RoomsAvailability({
                serverHealthMonitor: {blockingEnabled: true, isBlocking: false, usageReport: {isBlocking: false}},
                remoteServersStatus: this.createRecordingRemoteStatus(statusRequests),
                isRoomCreated: () => false,
                serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared(
                    this.selfServerUrl,
                    {'reldens-forest': this.remoteServerUrl, 'reldens-desert': 'http://localhost:8100'},
                    ''
                )
            });
            let unreachableRoom = {isAvailable: false, reason: GameConst.ROOM_UNAVAILABLE.SERVER_UNREACHABLE};
            this.assert.deepStrictEqual(
                await roomsAvailability.fetchRoomsAvailability(['reldens-forest', 'reldens-desert']),
                {'reldens-forest': unreachableRoom, 'reldens-desert': unreachableRoom}
            );
            this.assert.deepStrictEqual(statusRequests.started, [this.remoteServerUrl, 'http://localhost:8100']);
            let everyRequestStarted = statusRequests.started.length;
            this.assert.deepStrictEqual(statusRequests.startedWhenAnswered, [everyRequestStarted, everyRequestStarted]);
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

    async testTheOtherServersRoomsUsageListsOnlyTheReachableRemoteSummaries()
    {
        await this.test('the other servers rooms usage lists the reachable remote summaries, never this server one', async () => {
            let remoteRoomsUsage = {playersCount: 2, playersByStoredRoomId: {'4': 2}, activeUsersKeys: ['key-a', 'key-b']};
            let remoteStatuses = [
                {isReachable: true, usageReport: {isBlocking: false, roomsUsage: remoteRoomsUsage}},
                {isReachable: false, usageReport: false},
                {isReachable: true, usageReport: {isBlocking: false, roomsUsage: false}}
            ];
            let roomsUsageLists = [];
            for(let remoteStatus of remoteStatuses){
                let roomsAvailability = this.createRoomsAvailability(false, [], remoteStatus);
                roomsAvailability.serverHealthMonitor.usageReport.roomsUsage = {activeUsersKeys: ['key-self']};
                roomsUsageLists.push(await roomsAvailability.fetchOtherServersRoomsUsage());
            }
            this.assert.deepStrictEqual(roomsUsageLists, [[remoteRoomsUsage], [], []]);
        });
    }

    createRoomsAvailabilityWithUsages(localUsersKeys, roomsUsageByUrl)
    {
        return new RoomsAvailability({
            serverHealthMonitor: {blockingEnabled: true, isBlocking: false, usageReport: {isBlocking: false}},
            remoteServersStatus: {
                fetchStatus: async (serverUrl) => ({
                    isReachable: sc.hasOwn(roomsUsageByUrl, serverUrl),
                    usageReport: {roomsUsage: sc.get(roomsUsageByUrl, serverUrl, false)}
                }),
                fetchStatuses: RemoteServersStatus.prototype.fetchStatuses
            },
            roomsUsageCollector: {fetchActiveUsersKeys: () => localUsersKeys},
            isRoomCreated: () => false,
            serverToServerMessengerProps: ServerMessengerPropsBuilder.createShared(
                this.selfServerUrl,
                Object.assign(
                    {'reldens-cave': this.secondRemoteServerUrl, 'reldens-house': 'ws://localhost:8080/'},
                    this.roomsServers
                ),
                ''
            )
        });
    }

    async testTheOtherServersRoomPlayersAddOnlyNumbers()
    {
        await this.test('the other servers room players add only numbers, never a self alias', async () => {
            let roomsAvailability = this.createRoomsAvailabilityWithUsages([], {
                [this.remoteServerUrl]: {playersByStoredRoomId: {'4': 2, '5': '3'}},
                [this.secondRemoteServerUrl]: {playersByStoredRoomId: {'4': 3}}
            });
            this.assert.deepStrictEqual(
                [
                    roomsAvailability.remoteServersUrls,
                    await roomsAvailability.countOtherServersRoomPlayers(4),
                    await roomsAvailability.countOtherServersRoomPlayers(5),
                    await roomsAvailability.countOtherServersRoomPlayers(6)
                ],
                [[this.secondRemoteServerUrl, this.remoteServerUrl], 5, 0, 0]
            );
        });
    }

    async testTheActiveUsersCountAUserOnSeveralServersOnce()
    {
        await this.test('the active users count a user logged on several servers once and ignore the invalid keys lists', async () => {
            let roomsAvailability = this.createRoomsAvailabilityWithUsages(['key-a', 'key-b'], {
                [this.remoteServerUrl]: {activeUsersKeys: ['key-b', 'key-c', 7, {}]},
                [this.secondRemoteServerUrl]: {activeUsersKeys: 'key-d'}
            });
            let onlyLocalUsers = this.createRoomsAvailabilityWithUsages(['key-a'], {});
            this.assert.deepStrictEqual(
                [await roomsAvailability.countActiveUsers(), await onlyLocalUsers.countActiveUsers()],
                [3, 1]
            );
        });
    }

}

module.exports.TestRoomsAvailability = TestRoomsAvailability;
