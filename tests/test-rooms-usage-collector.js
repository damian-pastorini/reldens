/**
 *
 * Reldens - Test Rooms Usage Collector
 *
 * Tests the rooms usage summary of a server: the players of every stored room and the logged users listed as keys (an
 * HMAC of the prefixed user ID with the shared signed tokens secret, one per user with an open session), never their
 * IDs and never a count, no keys without the secret, and an empty summary with no rooms and no users.
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsUsageCollector } = require('../lib/game/server/health/rooms-usage-collector');
const { ActivePlayers } = require('../lib/game/server/memory/active-players');
const { GameConst } = require('../lib/game/constants');
const { Encryptor } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class TestRoomsUsageCollector extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.usersKeysSecret = 'shared-secret';
    }

    async testTheSummaryListsTheLoggedUsersKeysAndThePlayersPerStoredRoom()
    {
        await this.test('the rooms usage lists the logged users as keys, never their ids, and the players of every stored room', async () => {
            let activePlayers = new ActivePlayers();
            activePlayers.playersSessionsByUserId = {7: {sessionA: 'town'}, 8: {}, 9: {sessionB: 'house'}};
            let createdInstances = {
                townInstanceA: {state: {}, roomData: {roomId: 4}, playersCountInState: () => 2},
                townInstanceB: {state: {}, roomData: {roomId: 4}, playersCountInState: () => 1},
                houseInstance: {state: {}, roomData: {roomId: 5}, playersCountInState: () => 0},
                chatInstance: {clients: [{}]}
            };
            let roomsUsageCollector = new RoomsUsageCollector(createdInstances, activePlayers, this.usersKeysSecret);
            let roomsUsage = roomsUsageCollector.summarize(roomsUsageCollector.collect());
            let noUsersCollector = new RoomsUsageCollector({}, new ActivePlayers(), this.usersKeysSecret);
            let noUsersSummary = noUsersCollector.summarize([]);
            this.assert.deepStrictEqual(
                [
                    roomsUsage.playersByStoredRoomId,
                    roomsUsage.activeUsersKeys,
                    roomsUsage.activeUsersKeys.every((userKey) => /^[0-9a-f]{64}$/.test(userKey)),
                    [sc.hasOwn(roomsUsage, 'activeUsersIds'), sc.hasOwn(roomsUsage, 'activeUsersCount')],
                    new RoomsUsageCollector({}, activePlayers, '').fetchActiveUsersKeys(),
                    [noUsersSummary.playersByStoredRoomId, noUsersSummary.activeUsersKeys]
                ],
                [
                    {4: 3, 5: 0},
                    ['7', '9'].map(
                        (userId) => Encryptor.generateHMAC(GameConst.HEALTH.ACTIVE_USER_KEY_PREFIX+userId, this.usersKeysSecret)
                    ),
                    true,
                    [false, false],
                    [],
                    [{}, []]
                ]
            );
        });
    }

}

module.exports.TestRoomsUsageCollector = TestRoomsUsageCollector;
