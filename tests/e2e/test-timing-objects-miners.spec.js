/**
 *
 * Reldens - Test Timing Objects Miners
 *
 * Tests two group players mining two different forest rocks at the same time (the first one on the first mining rock,
 * TimingMiningSteps, the second one placed from the server next to the closest other active rock, inside its
 * interaction area), checked on the first player recorded messages and inventory and on the second player recorded
 * messages and stored reward: a move of the first player cancels only its mining and the second one is rewarded; an
 * enemy hit on the first player cancels only its mining and the second one is rewarded; and the first player attacking
 * the second one while both mine cancels only the second mining and the first one completes.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsMiners
{

    static ENEMY_OBJECT_TYPE = 4;

    static async fetchStoredReward(gameConfig, rewardItemId)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, gameConfig.e2ePlayerName, rewardItemId);
    }

    static async enterTwoMiners(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let second = {gameConfig: Login.fetchSecondPlayerConfig(context.gameConfig)};
        await Login.loginAndEnterForest(context.secondPage, second.gameConfig, context.longRun);
        let otherRock = (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME))
            .filter(snapshot => context.gameConfig.e2eMiningRockKey === snapshot.assetKey)
            .filter(snapshot => mining.rockKey !== snapshot.bodyKey && GameConst.STATUS.ACTIVE === snapshot.inState)
            .sort((rockA, rockB) => TestTimingObjectsMiners.distanceTo(rockA, mining.rock) - TestTimingObjectsMiners.distanceTo(rockB, mining.rock))
            .shift();
        expect(otherRock, 'Another active mining rock must exist').toBeTruthy();
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            second.gameConfig,
            Login.FOREST_ROOM_NAME,
            otherRock.key,
            TimeConstants.SCENE_LOAD
        );
        expect([placed.reached, placed.bodyKey], 'The second miner is placed next to the other rock').toEqual([true, otherRock.bodyKey]);
        second.rockKey = otherRock.bodyKey;
        second.rock = await TimingObjectSession.fetchTimingState(context.gameConfig, second.rockKey);
        expect(TimingMiningSteps.isInsideArea(placed.position, second.rock), 'The second miner reaches its rock').toBe(true);
        second.storedBefore = await TestTimingObjectsMiners.fetchStoredReward(second.gameConfig, mining.rewardItemId);
        second.position = placed.position;
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TimingObjectSession.startTiming(context.secondPage, second.rockKey, mining.serverTimeout);
        return {mining, second};
    }

    static distanceTo(snapshot, position)
    {
        return Math.hypot(snapshot.x - position.x, snapshot.y - position.y);
    }

    static async expectSecondRewarded(context, miners)
    {
        await TimingObjectSession.waitForTimingAction(
            context.secondPage,
            TimingMiningSteps.COMPLETE,
            miners.mining.duration + miners.mining.serverTimeout
        );
        await expect.poll(
            async () => await TestTimingObjectsMiners.fetchStoredReward(miners.second.gameConfig, miners.mining.rewardItemId),
            {message: 'The second miner is rewarded once', timeout: miners.mining.serverTimeout}
        ).toBe(miners.second.storedBefore + 1);
        expect(await TimingObjectSession.fetchRecordedActions(context.secondPage), 'The second mining completes')
            .toEqual([TimingMiningSteps.START, TimingMiningSteps.COMPLETE]);
    }

    static async runFirstMovesTest(context)
    {
        let miners = await TestTimingObjectsMiners.enterTwoMiners(context);
        await TimingObjectSession.sideStep(context.page);
        await TimingMiningSteps.expectCancelled(context.page, miners.mining, 'The first miner move cancels its mining');
        await TestTimingObjectsMiners.expectSecondRewarded(context, miners);
    }

    static async runFirstHitTest(context)
    {
        let passiveEnemyArea = BaseE2eTest.loadRoomEntries(Login.FOREST_ROOM_NAME, ['respawnAreas']).find(
            area => TestTimingObjectsMiners.ENEMY_OBJECT_TYPE === area.childObjectType && !area.isAggressive
        );
        expect(passiveEnemyArea, 'The forest must have a passive enemy').toBeTruthy();
        let miners = await TestTimingObjectsMiners.enterTwoMiners(context);
        let enemyAttack = await RoomObjectsApi.startEnemyAttack(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            passiveEnemyArea.assetKey
        );
        expect(enemyAttack.enemyKey, 'The enemy attack must start: '+enemyAttack.error).toBeTruthy();
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, miners.mining.duration);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        await TestTimingObjectsMiners.expectSecondRewarded(context, miners);
    }

    static async runFirstAttacksSecondTest(context)
    {
        let miners = await TestTimingObjectsMiners.enterTwoMiners(context);
        let secondSessionId = await context.secondPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        await Phaser.waitForPlayerBySessionId(context.page, secondSessionId, TimeConstants.SCENE_LOAD);
        await context.page.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            secondSessionId
        );
        let isCancelled = await RoomObjectsApi.attackTargetUntil(
            context.page,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => (await TimingObjectSession.fetchRecordedActions(context.secondPage)).includes(TimingMiningSteps.CANCEL),
            miners.mining.duration
        );
        expect(isCancelled, 'The first miner attack cancels the second mining').toBe(true);
        await TimingMiningSteps.expectCompleted(context.page, miners.mining, 'The attacking miner completes');
        expect(
            await TestTimingObjectsMiners.fetchStoredReward(miners.second.gameConfig, miners.mining.rewardItemId),
            'The second miner gets no reward'
        ).toBe(miners.second.storedBefore);
    }

    static run()
    {
        test.describe('Timing Objects Miners', () => {
            test('first miner move cancels only its mining', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsMiners.runFirstMovesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy hit on the first miner cancels only its mining', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsMiners.runFirstHitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('first miner attacking the second cancels only the second mining', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsMiners.runFirstAttacksSecondTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsMiners.run();
