/**
 *
 * Reldens - Test Guests Cleanup
 *
 */

const { BaseTest } = require('./base-test');
const { GuestsCleanup } = require('../lib/users/server/guests-cleanup');
const { UsersManager } = require('../lib/users/server/manager');
const { GameConst } = require('../lib/game/constants');

class TestGuestsCleanup extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.guestRoleId = 3;
    }

    createGuestsCleanup(activeSessions, staleGuests)
    {
        let cleanupSetup = {touchedUserIds: [], deletedUserIds: [], loadCalls: 0};
        cleanupSetup.guestsCleanup = new GuestsCleanup({
            usersManager: {
                touchGuests: async (guestRoleId, userIds) => cleanupSetup.touchedUserIds.push(...userIds),
                loadGuestsOlderThan: async () => {
                    cleanupSetup.loadCalls++;
                    return staleGuests;
                },
                deleteGuestUser: async (guestUser) => cleanupSetup.deletedUserIds.push(guestUser.id)
            },
            activePlayers: {playersSessionsByUserId: activeSessions},
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            cleanupAfterMs: 60000,
            cleanupIntervalMs: 1000
        });
        cleanupSetup.guestsCleanup.guestRoleId = this.guestRoleId;
        return cleanupSetup;
    }

    createClaimUsersManager(claimResult, failingDeletion)
    {
        let managerSetup = {updates: [], deletedUserIds: []};
        let usersManager = Object.create(UsersManager.prototype);
        usersManager.clanRepository = {loadOneBy: async () => false};
        usersManager.usersRepository = {
            update: async (filters, patch) => {
                managerSetup.updates.push({filters, patch});
                return claimResult;
            },
            updateById: async (userId, patch) => managerSetup.updates.push({userId, patch}),
            deleteById: async (userId) => managerSetup.deletedUserIds.push(userId)
        };
        usersManager.usersLoginRepository = {delete: async () => true};
        usersManager.usersLocaleRepository = {
            delete: async () => failingDeletion ? Promise.reject({message: 'Storage.'}) : true
        };
        usersManager.questsProgressRepository = {delete: async () => true};
        usersManager.playersRepository = {deleteById: async () => true};
        managerSetup.usersManager = usersManager;
        return managerSetup;
    }

    async testTheOverlappingRunsAreSkipped()
    {
        await this.test('a cleanup run started while another one is running is skipped', async () => {
            let cleanupSetup = this.createGuestsCleanup({}, [{id: 1}]);
            let guestsCleanup = cleanupSetup.guestsCleanup;
            let runs = await Promise.all([guestsCleanup.runCleanup(), guestsCleanup.runCleanup()]);
            this.assert.deepStrictEqual(runs, [1, 0]);
            this.assert.strictEqual(cleanupSetup.loadCalls, 1);
            this.assert.strictEqual(guestsCleanup.isRunning, false);
        });
    }

    async testTheLocalActiveGuestsAreTouchedAndKept()
    {
        await this.test('the guests with a local session are touched and kept, an emptied map is inactive', async () => {
            let cleanupSetup = this.createGuestsCleanup(
                {1: {'session-a': 'room-a'}, 2: {}},
                [{id: 1}, {id: 2}]
            );
            await cleanupSetup.guestsCleanup.runCleanup();
            this.assert.deepStrictEqual(cleanupSetup.touchedUserIds, [1]);
            this.assert.deepStrictEqual(cleanupSetup.deletedUserIds, [2]);
        });
    }

    async testTheGuestIsNotDeletedWhenTheClaimFails()
    {
        await this.test('a guest used again elsewhere is not deleted when the claim updates no row', async () => {
            let managerSetup = this.createClaimUsersManager(0, false);
            let guestUser = {id: 7, role_id: this.guestRoleId, status: '1', related_players: []};
            this.assert.strictEqual(await managerSetup.usersManager.deleteGuestUser(guestUser, Date.now()), false);
            this.assert.strictEqual(managerSetup.deletedUserIds.length, 0);
            let claimUpdate = [...managerSetup.updates].shift();
            this.assert.strictEqual(claimUpdate.filters.id, 7);
            this.assert.strictEqual(claimUpdate.filters.role_id, this.guestRoleId);
            this.assert.strictEqual(claimUpdate.filters.updated_at.operator, 'LT');
            this.assert.deepStrictEqual(claimUpdate.patch, {status: GameConst.BANNED_USER_STATUS});
        });
    }

    async testTheStatusIsRestoredAfterAFailedDeletion()
    {
        await this.test('the claimed guest status is restored when a deletion step fails', async () => {
            let managerSetup = this.createClaimUsersManager(1, true);
            let guestUser = {id: 7, role_id: this.guestRoleId, status: '1', related_players: []};
            this.assert.strictEqual(await managerSetup.usersManager.deleteGuestUser(guestUser, Date.now()), false);
            this.assert.strictEqual(managerSetup.deletedUserIds.length, 0);
            this.assert.deepStrictEqual([...managerSetup.updates].pop(), {userId: 7, patch: {status: '1'}});
        });
    }

    async testTheClaimedGuestIsDeleted()
    {
        await this.test('a claimed stale guest is deleted', async () => {
            let managerSetup = this.createClaimUsersManager(1, false);
            let guestUser = {id: 7, role_id: this.guestRoleId, status: '1', related_players: []};
            this.assert.strictEqual(await managerSetup.usersManager.deleteGuestUser(guestUser, Date.now()), true);
            this.assert.deepStrictEqual(managerSetup.deletedUserIds, [7]);
        });
    }

    async testTheCleanupDoesNotStartWithAnIntervalAboveTheCleanupTime()
    {
        await this.test('the cleanup does not start when the interval is not lower than the cleanup time', async () => {
            let cleanupSetup = this.createGuestsCleanup({}, []);
            cleanupSetup.guestsCleanup.enabled = true;
            cleanupSetup.guestsCleanup.cleanupIntervalMs = 60000;
            this.assert.strictEqual(cleanupSetup.guestsCleanup.start(), false);
            this.assert.strictEqual(cleanupSetup.guestsCleanup.intervalTimer, false);
        });
    }

}

module.exports.TestGuestsCleanup = TestGuestsCleanup;
