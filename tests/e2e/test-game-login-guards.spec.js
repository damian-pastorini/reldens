/**
 *
 * Reldens - Test Game Login Guards
 *
 * Tests the game login guards around the lockout: the stored address blocks restored after a restart only while they
 * did not expire, a repeated block updating its stored row, the permanent deny rows kept as they are, the banned
 * accounts not counting failures, the banned, blocked and throttled rejections answering the same text, the password
 * validations cap and the joins with missing or invalid options.
 *
 */

const { sc } = require('@reldens/utils');
const { BaseE2eTest } = require('./base-e2e-test');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { PlayerReset } = require('./helpers/player-reset');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestGameLoginGuards
{

    static ATTEMPTS_LIMIT = 2;
    static SHORT_BLOCK_MS = 1000;
    static STORED_BLOCK_OFFSET_MS = 60000;
    static VALIDATIONS_CAP = 2;
    static CONCURRENT_LOGINS = 5;
    static IPV4_STORED_ADDRESS = '127.0.0.1';

    static createDenyRow(gameConfig, e2eGroup, address, expiresAt)
    {
        return E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'ipLists', {
            address,
            list_type: 'deny',
            reason: 'e2e stored block',
            expires_at: expiresAt
        });
    }

    static async fetchLoginResult(gameConfig, username, host)
    {
        return await GameRoomJoin.login(gameConfig, username, gameConfig.e2ePassword, host);
    }

    static async runExpiredStoredBlockTest(gameConfig, e2eGroup)
    {
        let now = Date.now();
        let expiredAt = sc.formatDate(new Date(now - TestGameLoginGuards.STORED_BLOCK_OFFSET_MS));
        let activeUntil = sc.formatDate(new Date(now + TestGameLoginGuards.STORED_BLOCK_OFFSET_MS));
        await TestGameLoginGuards.createDenyRow(gameConfig, e2eGroup, TestGameLoginGuards.IPV4_STORED_ADDRESS, expiredAt);
        await TestGameLoginGuards.createDenyRow(gameConfig, e2eGroup, '::1', activeUntil);
        expect(await SecurityApi.restoreBlocks(gameConfig), 'Only the active stored block').toBe(1);
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST)).toEqual(
            GameRoomJoin.ACCEPTED
        );
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV6_HOST)).toEqual(
            GameRoomJoin.REJECTED
        );
    }

    static async fetchStoredBlocksAfterLockout(gameConfig)
    {
        await GameRoomJoin.failLogins(gameConfig, Array(TestGameLoginGuards.ATTEMPTS_LIMIT).fill(gameConfig.e2eUsername));
        await expect.poll(async () => (await SecurityApi.fetchStoredBlocks(gameConfig)).length).toBe(1);
        return await SecurityApi.fetchStoredBlocks(gameConfig);
    }

    static async runRepeatedBlockTest(page, gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {
            maxAttempts: TestGameLoginGuards.ATTEMPTS_LIMIT,
            blockTimeMs: TestGameLoginGuards.SHORT_BLOCK_MS
        });
        let firstBlock = (await TestGameLoginGuards.fetchStoredBlocksAfterLockout(gameConfig)).shift();
        await page.waitForTimeout(TestGameLoginGuards.SHORT_BLOCK_MS);
        let repeatedBlocks = await TestGameLoginGuards.fetchStoredBlocksAfterLockout(gameConfig);
        await expect.poll(async () => (await SecurityApi.fetchStoredBlocks(gameConfig)).shift().expiresAt).toBeGreaterThan(
            firstBlock.expiresAt
        );
        expect(repeatedBlocks.map(storedBlock => storedBlock.address), 'One row updated').toEqual([firstBlock.address]);
    }

    static async runPermanentDenyRowTest(gameConfig, e2eGroup)
    {
        await TestGameLoginGuards.createDenyRow(gameConfig, e2eGroup, TestGameLoginGuards.IPV4_STORED_ADDRESS, null);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestGameLoginGuards.ATTEMPTS_LIMIT});
        await GameRoomJoin.failLogins(gameConfig, Array(TestGameLoginGuards.ATTEMPTS_LIMIT).fill(gameConfig.e2eUsername));
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST)).toEqual(
            GameRoomJoin.REJECTED
        );
        let storedRows = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'ipLists', {list_type: 'deny'});
        expect(storedRows.map(storedRow => [storedRow.address, storedRow.expires_at]), 'Kept permanent').toEqual([
            [TestGameLoginGuards.IPV4_STORED_ADDRESS, null]
        ]);
        expect(await SecurityApi.restoreBlocks(gameConfig), 'Not restored as a temporary block').toBe(0);
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST)).toEqual(
            GameRoomJoin.ACCEPTED
        );
    }

    static async runBannedWrongPasswordTest(gameConfig)
    {
        let bannedUsername = gameConfig.e2eUsername3;
        expect((await SecurityApi.banUser(gameConfig, bannedUsername)).ok).toBe(true);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestGameLoginGuards.ATTEMPTS_LIMIT});
        await GameRoomJoin.failLogins(gameConfig, Array(TestGameLoginGuards.ATTEMPTS_LIMIT + 1).fill(bannedUsername));
        expect(await SecurityApi.fetchIdentityState(gameConfig, bannedUsername)).toEqual({hits: 0, blocked: false});
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV4_HOST)).toEqual(
            GameRoomJoin.ACCEPTED
        );
    }

    static async runUniformRejectionsTest(gameConfig)
    {
        expect((await SecurityApi.banUser(gameConfig, gameConfig.e2eUsername3)).ok).toBe(true);
        await SecurityApi.updateSettings(gameConfig, {maxAttempts: TestGameLoginGuards.ATTEMPTS_LIMIT, gameLoginMaxJoins: 2});
        let bannedResult = await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername3, GameRoomJoin.IPV6_HOST);
        expect(bannedResult, 'Banned').toEqual(GameRoomJoin.REJECTED);
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV6_HOST)).toEqual(
            GameRoomJoin.ACCEPTED
        );
        let throttledResult = await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername2, GameRoomJoin.IPV6_HOST);
        expect(throttledResult, 'Throttled').toEqual(GameRoomJoin.REJECTED);
        await GameRoomJoin.failLogins(gameConfig, [gameConfig.e2eUsername, gameConfig.e2eUsername]);
        let blockedResult = await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST);
        expect(blockedResult, 'Blocked').toEqual(GameRoomJoin.REJECTED);
    }

    static async runValidationsCapTest(gameConfig)
    {
        await SecurityApi.updateSettings(gameConfig, {maxPendingValidations: TestGameLoginGuards.VALIDATIONS_CAP});
        let concurrentResults = await Promise.all(Array.from(
            {length: TestGameLoginGuards.CONCURRENT_LOGINS},
            () => TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST)
        ));
        expect(concurrentResults.filter(loginResult => !loginResult.joined), 'Over the cap').toEqual(Array(
            TestGameLoginGuards.CONCURRENT_LOGINS - TestGameLoginGuards.VALIDATIONS_CAP
        ).fill(GameRoomJoin.REJECTED));
        expect(await TestGameLoginGuards.fetchLoginResult(gameConfig, gameConfig.e2eUsername, GameRoomJoin.IPV4_HOST)).toEqual(
            GameRoomJoin.ACCEPTED
        );
    }

    static async runInvalidJoinOptionsTest(gameConfig)
    {
        let password = gameConfig.e2ePassword;
        let invalidOptions = [
            {},
            {password},
            {username: '', password},
            {username: 12345, password},
            {username: [gameConfig.e2eUsername], password}
        ];
        for(let joinOptions of invalidOptions){
            expect(await GameRoomJoin.join(gameConfig, joinOptions), sc.toJsonString(joinOptions)).toEqual(GameRoomJoin.REJECTED);
        }
    }

    static run()
    {
        test.describe('Game Login Guards', () => {
            test.beforeEach(async ({ gameConfig, e2eGroup }) => {
                await PlayerReset.resetAll(gameConfig, e2eGroup);
            });
            test('restart restores only the stored blocks that did not expire', async ({ gameConfig, e2eGroup }) => {
                await TestGameLoginGuards.runExpiredStoredBlockTest(gameConfig, e2eGroup);
            });
            test('repeated block updates its stored row', async ({ page, gameConfig }) => {
                await TestGameLoginGuards.runRepeatedBlockTest(page, gameConfig);
            });
            test('permanent deny row is kept and not restored as a temporary block', async ({ gameConfig, e2eGroup }) => {
                await TestGameLoginGuards.runPermanentDenyRowTest(gameConfig, e2eGroup);
            });
            test('banned account with a wrong password counts no failure', async ({ gameConfig }) => {
                await TestGameLoginGuards.runBannedWrongPasswordTest(gameConfig);
            });
            test('banned, throttled and blocked logins answer the invalid login text', async ({ gameConfig }) => {
                await TestGameLoginGuards.runUniformRejectionsTest(gameConfig);
            });
            test('logins over the password validations cap are rejected and release the slots', async ({ gameConfig }) => {
                await TestGameLoginGuards.runValidationsCapTest(gameConfig);
            });
            test('joins without options or with an invalid username are rejected', async ({ gameConfig }) => {
                await TestGameLoginGuards.runInvalidJoinOptionsTest(gameConfig);
            });
        });
    }

}

TestGameLoginGuards.run();
