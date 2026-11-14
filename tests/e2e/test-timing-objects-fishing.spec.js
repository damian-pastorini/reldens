/**
 *
 * Reldens - Test Timing Objects Fishing
 *
 * Tests the cancel rules on the first forest fishing spot (a timing object with a fish reward of rate 100), the player
 * placed from the server next to the spot with the forest enemies disabled and the stored fish quantity checked: a move,
 * an enemy hit and another player hit cancel the fishing with one timingCancel and no fish; and a leave in the last
 * checks interval before the timer ends (the timing stop held for the group, so the completion runs for the player
 * that left) gives no fish.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsFishing
{

    static FISHING_SPOT_KEY = 'fish_spawn_forest_1';
    static FISH_KEY = 'fish';
    static OPEN_TILES_DISTANCE = 2;

    static async fetchStoredFish(gameConfig)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, gameConfig.e2ePlayerName, TestTimingObjectsFishing.FISH_KEY);
    }

    static async startFishing(context, minimumTilesDistance = 0)
    {
        test.setTimeout(TimeConstants.forLongRun(TimingObjectSession.MINING_TEST_TIMEOUT, context.longRun));
        let forestData = await TimingObjectSession.enterForestWithoutEnemies(
            context.page,
            context.gameConfig,
            context.longRun
        );
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            TestTimingObjectsFishing.FISHING_SPOT_KEY,
            forestData.sceneTimeout,
            minimumTilesDistance
        );
        expect(placement.reached, 'The fisher must be placed next to the fishing spot: '+placement.error).toBe(true);
        let spotKey = placement.bodyKey;
        let spot = await TimingObjectSession.fetchTimingState(context.gameConfig, spotKey);
        expect(spot.key, 'The fishing spot timing state must be read: '+spot.error).toBe(spotKey);
        let fishing = {
            spotKey,
            duration: spot.timingDuration,
            serverTimeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, context.longRun),
            storedBefore: await TestTimingObjectsFishing.fetchStoredFish(context.gameConfig)
        };
        await TimingObjectSession.startTiming(context.page, spotKey, fishing.serverTimeout);
        return fishing;
    }

    static async expectNoFish(context, fishing, message)
    {
        await context.page.waitForTimeout(fishing.duration + TimeConstants.ACTION);
        expect(await TestTimingObjectsFishing.fetchStoredFish(context.gameConfig), message+': no fish').toBe(fishing.storedBefore);
    }

    static async expectCancelledFishing(context, fishing, message)
    {
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, fishing.duration);
        await TestTimingObjectsFishing.expectNoFish(context, fishing, message);
        expect(await TimingObjectSession.fetchRecordedActions(context.page), message+': one terminal message')
            .toEqual([TimingMiningSteps.START, TimingMiningSteps.CANCEL]);
    }

    static async runMoveCancelTest(context)
    {
        let fishing = await TestTimingObjectsFishing.startFishing(context);
        await TimingObjectSession.sideStep(context.page);
        await TestTimingObjectsFishing.expectCancelledFishing(context, fishing, 'A move cancels the fishing');
    }

    static async runEnemyHitCancelTest(context)
    {
        let passiveEnemyKey = TestCombatDeath.loadPassiveEnemyKey();
        let fishing = await TestTimingObjectsFishing.startFishing(context, TestTimingObjectsFishing.OPEN_TILES_DISTANCE);
        await TestCombatDeath.startEnemyAttack(context.gameConfig, passiveEnemyKey);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, fishing.duration);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        await TestTimingObjectsFishing.expectNoFish(context, fishing, 'An enemy hit cancels the fishing');
    }

    static async runPlayerHitCancelTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimingObjectSession.MINING_TEST_TIMEOUT + TimeConstants.GAME_START, context.longRun));
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        let fishing = await TestTimingObjectsFishing.startFishing(context, TestTimingObjectsFishing.OPEN_TILES_DISTANCE);
        let fisherSessionId = await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            secondGameConfig.e2ePlayerName,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The attacker must be placed next to the fisher: '+placed.error).toBeTruthy();
        await Phaser.waitForPlayerBySessionId(context.secondPage, fisherSessionId, TimeConstants.SCENE_LOAD);
        await context.secondPage.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            fisherSessionId
        );
        let isCancelled = await RoomObjectsApi.attackTargetUntil(
            context.secondPage,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => (await TimingObjectSession.fetchRecordedActions(context.page)).includes(TimingMiningSteps.CANCEL),
            fishing.duration
        );
        expect(isCancelled, 'The other player hit cancels the fishing').toBe(true);
        await TestTimingObjectsFishing.expectNoFish(context, fishing, 'A player hit cancels the fishing');
    }

    static async runLastIntervalLeaveTest(context)
    {
        let forestData = await TimingObjectSession.enterForestWithoutEnemies(context.page, context.gameConfig, context.longRun);
        let spotKey = await TimingObjectSession.placeNextToObject(
            context.page,
            context.gameConfig,
            TestTimingObjectsFishing.FISHING_SPOT_KEY,
            forestData.sceneTimeout,
            'fishing spot'
        );
        await TimingObjectSession.holdTimingStop(context.gameConfig, context.e2eGroup, spotKey);
        let storedBefore = await TestTimingObjectsFishing.fetchStoredFish(context.gameConfig);
        await TimingObjectSession.startTiming(context.page, spotKey, TimeConstants.SERVER_RESPONSE);
        let duration = (await TimingObjectSession.fetchTimingState(context.gameConfig, spotKey)).timingDuration;
        await context.page.reload();
        await TestTimingObjectsFishing.expectNoFish(context, {duration, storedBefore}, 'A leave before the timer ends');
    }

    static run()
    {
        test.describe('Timing Objects Fishing', () => {
            test('move cancels the fishing with no fish', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsFishing.runMoveCancelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy hit cancels the fishing with no fish', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsFishing.runEnemyHitCancelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('another player hit cancels the fishing with no fish', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsFishing.runPlayerHitCancelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('leave in the last checks interval gives no fish', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsFishing.runLastIntervalLeaveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsFishing.run();
