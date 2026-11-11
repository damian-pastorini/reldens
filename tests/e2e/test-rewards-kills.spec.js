/**
 *
 * Reldens - Test Rewards Kills
 *
 * Tests the rewards a player gets for killing the configured forest enemy (exclusive group, KillRewardsSteps: the
 * enemy placed with one hit point and the reward of its live instances changed for the group): a non droppable item
 * reward goes straight to the inventory with its experience; a reward with a drop rate or a drop quantity of zero gives
 * nothing; a reward with no item, modifier or experience gives nothing; an item reward with no drop animation goes
 * straight to the inventory; a reldens.beforeGiveRewards listener that cancels the event leaves nothing given (a
 * non droppable reward with a drop quantity above one gives a single non stackable item,
 * ISSUE #150); a reward with a missing item record gives no item while its experience is still given; a unique reward is given and its
 * stored was_given is set (the next kill gives it again, ISSUE #167); and a modifier reward is applied to the killer.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillRewardsSteps } = require('./helpers/kill-rewards-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsKills
{

    static UNKNOWN_ITEM_ID = 999999;
    static MODIFIER_VALUE = 5;
    static CASES = {
        nonDroppable: {rewardChanges: {hasDropBody: false, dropQuantity: 1}, givenItems: 1, experienceShare: 1},
        dropRateZero: {rewardChanges: {hasDropBody: false, dropQuantity: 1, dropRate: 0}, givenItems: 0, experienceShare: 0},
        dropQuantityZero: {rewardChanges: {hasDropBody: false, dropQuantity: 0}, givenItems: 0, experienceShare: 0},
        invalid: {rewardChanges: {itemId: null, experience: 0}, givenItems: 0, experienceShare: 0},
        noAnimation: {rewardChanges: {animationData: null, dropQuantity: 1}, givenItems: 1, experienceShare: 1},
        cancelled: {
            rewardChanges: {hasDropBody: false, dropQuantity: 1},
            cancelledEvents: ['reldens.beforeGiveRewards'],
            givenItems: 0,
            experienceShare: 0
        },
        missingItem: {
            rewardChanges: {hasDropBody: false, dropQuantity: 1, itemId: TestRewardsKills.UNKNOWN_ITEM_ID, item: null},
            givenItems: 0,
            experienceShare: 1
        }
    };

    static async fetchKillerRewards(context, itemKey)
    {
        let gameConfig = context.gameConfig;
        let killerRewards = {
            quantity: await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, gameConfig.e2ePlayerName, itemKey)
        };
        let player = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName);
        killerRewards.experience = player.experience;
        killerRewards.atk = player.stats.atk;
        return killerRewards;
    }

    static async killWithReward(context, rewardChanges)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + 2 * TimeConstants.ENEMY_KILL);
        let reward = await KillRewardsSteps.fetchEnemyReward(context.gameConfig);
        let placement = await KillRewardsSteps.enterWithPlacedEnemy(context);
        await KillRewardsSteps.changeEnemyReward(context, rewardChanges);
        let before = await TestRewardsKills.fetchKillerRewards(context, reward.item.key);
        await KillRewardsSteps.killPlacedEnemy(context, placement);
        return {reward, before};
    }

    static async runKillRewardTest(context, caseKey)
    {
        let killCase = TestRewardsKills.CASES[caseKey];
        for(let eventName of sc.get(killCase, 'cancelledEvents', [])){
            let cancelled = await GameplayE2eStateApi.cancelEvent(context.gameConfig, context.e2eGroup, eventName);
            expect(cancelled.cancelled, 'The '+eventName+' event is cancelled').toBe(true);
        }
        let killed = await TestRewardsKills.killWithReward(context, killCase.rewardChanges);
        await expect.poll(async () => await TestRewardsKills.fetchKillerRewards(context, killed.reward.item.key), {
            message: 'The killer rewards',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual({
            quantity: killed.before.quantity + killCase.givenItems,
            experience: killed.before.experience + killCase.experienceShare * Number(killed.reward.experience),
            atk: killed.before.atk
        });
    }

    static async runUniqueTest(context)
    {
        let reward = await KillRewardsSteps.fetchEnemyReward(context.gameConfig);
        await E2eSeedAndRestoreApi.preserveRows(context.gameConfig, context.e2eGroup, 'rewards', {id: reward.id});
        let killed = await TestRewardsKills.killWithReward(context, {isUnique: true, hasDropBody: false, dropQuantity: 1});
        let givenOnce = killed.before.quantity + 1;
        await expect.poll(
            async () => (await TestRewardsKills.fetchKillerRewards(context, reward.item.key)).quantity,
            {message: 'The unique reward is given', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(givenOnce);
        await expect.poll(
            async () => Number([...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rewards', {id: reward.id})]
                .shift().was_given),
            {message: 'The unique reward is stored as given', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
    }

    static async runModifierTest(context)
    {
        let killed = await TestRewardsKills.killWithReward(context, {
            modifierId: TestRewardsKills.UNKNOWN_ITEM_ID,
            modifier: {
                key: 'e2e-reward-atk',
                property_key: 'stats/atk',
                operation: ModifierConst.OPS.INC,
                value: TestRewardsKills.MODIFIER_VALUE
            }
        });
        await expect.poll(
            async () => (await TestRewardsKills.fetchKillerRewards(context, killed.reward.item.key)).atk,
            {message: 'The modifier reward is applied to the killer', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(killed.before.atk + TestRewardsKills.MODIFIER_VALUE);
    }

    static run()
    {
        test.describe('Rewards Kills', () => {
            test('non droppable item reward goes straight to the inventory', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'nonDroppable');
            });
            test('reward with drop rate zero gives nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'dropRateZero');
            });
            test('reward with drop quantity zero gives nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'dropQuantityZero');
            });
            test('reward without item, modifier or experience gives nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'invalid');
            });
            test('item reward without drop animation goes straight to the inventory', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'noAnimation');
            });
            test('rewards cancelled by a beforeGiveRewards listener give nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'cancelled');
            });
            test('reward with a missing item record gives no item and still its experience', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runKillRewardTest({page, screenshots, gameConfig, e2eGroup, longRun}, 'missingItem');
            });
            test('unique reward is given and stored as given', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runUniqueTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('modifier reward is applied to the killer', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsKills.runModifierTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRewardsKills.run();
