/**
 *
 * Reldens - Test Timing Objects Deaths
 *
 * Tests a miner killed during a timing on the first forest mining rock (TimingMiningSteps), its death config set for
 * the group (DeathReviveSteps) and its life set to the points one hit removes before the mining starts, so only the
 * killing hit of a passive forest enemy (TestCombatDeath) lowers it during the mining: with the hit rule on the kill
 * cancels the mining with no reward; with the hit rule off and the player kept dead (no auto revive and a long game
 * over) the rock is free after the completion (the dead player gets the reward, ISSUE #178); and with the hit rule off and the death teleport on the
 * player moved to the town gets no reward and the rock is free.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsDeaths
{

    static ENEMY_OBJECT_TYPE = 4;
    static LONG_GAME_OVER_SECONDS = 20;
    static SHORT_GAME_OVER_SECONDS = 1;

    static async killDuringMining(context, deathConfig, rules)
    {
        await DeathReviveSteps.prepareDeath(context, deathConfig);
        let passiveEnemyArea = BaseE2eTest.loadRoomEntries(Login.FOREST_ROOM_NAME, ['respawnAreas']).find(
            area => TestTimingObjectsDeaths.ENEMY_OBJECT_TYPE === area.childObjectType && !area.isAggressive
        );
        expect(passiveEnemyArea, 'The forest must have a passive enemy').toBeTruthy();
        let mining = await TimingMiningSteps.prepare(context, rules);
        mining.storedBefore = await E2eSeedAndRestoreApi.fetchInventoryQuantity(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            mining.rewardItemId
        );
        let lastHitPoints = await RoomObjectsApi.setPlayerAffectedProperty(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            TestCombatDeath.LAST_HIT_POINTS
        );
        expect(lastHitPoints.value, 'The miner last hit points must be set').toBe(TestCombatDeath.LAST_HIT_POINTS);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TestCombatDeath.killPlayerWithEnemyAttack(
            context.page,
            context.gameConfig,
            passiveEnemyArea.assetKey,
            mining.duration
        );
        return mining;
    }

    static async expectRockFree(context, mining)
    {
        await context.page.waitForTimeout(mining.duration + TimeConstants.ACTION);
        let rockState = await TimingObjectSession.fetchTimingState(context.gameConfig, mining.rockKey);
        expect(rockState.isActive, 'The rock is free').toBe(false);
    }

    static async expectNoStoredReward(context, mining, message)
    {
        await TestTimingObjectsDeaths.expectRockFree(context, mining);
        expect(await E2eSeedAndRestoreApi.fetchInventoryQuantity(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            mining.rewardItemId
        ), message).toBe(mining.storedBefore);
    }

    static async runKillCancelTest(context)
    {
        let mining = await TestTimingObjectsDeaths.killDuringMining(
            context,
            {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
            {}
        );
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, mining.serverTimeout);
        await TestTimingObjectsDeaths.expectNoStoredReward(context, mining, 'The killing hit cancels the mining');
    }

    static async runDeadMinerTest(context)
    {
        let mining = await TestTimingObjectsDeaths.killDuringMining(context, {
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false,
            [ActionsConst.DEATH.CONFIG_PATHS.AUTO_REVIVE]: false,
            [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: TestTimingObjectsDeaths.LONG_GAME_OVER_SECONDS
        }, {cancelOnHit: false});
        await TestTimingObjectsDeaths.expectRockFree(context, mining);
    }

    static async runDeathTeleportTest(context)
    {
        let mining = await TestTimingObjectsDeaths.killDuringMining(context, {
            [ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: true,
            [ActionsConst.DEATH.CONFIG_PATHS.GAME_OVER_TIME_OUT]: TestTimingObjectsDeaths.SHORT_GAME_OVER_SECONDS
        }, {cancelOnHit: false});
        await Navigation.waitForRoom(context.page, Login.TOWN_ROOM_NAME, mining.duration);
        await TestTimingObjectsDeaths.expectNoStoredReward(context, mining, 'The teleported miner gets no reward');
    }

    static run()
    {
        test.describe('Timing Objects Deaths', () => {
            test('killing hit cancels the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsDeaths.runKillCancelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('hit rule off: the rock of the dead miner is free after the completion', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsDeaths.runDeadMinerTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('hit rule off: the miner moved by the death teleport gets no reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsDeaths.runDeathTeleportTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsDeaths.run();
