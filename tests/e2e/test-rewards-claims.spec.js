/**
 *
 * Reldens - Test Rewards Claims
 *
 * Tests the claims of the reward events by the group players (RewardsSteps: the claims sent like a client sends them,
 * the stored claim states and the event data changed for the group; TradeSteps: the inventory rows preserved and the
 * live items read from the server; the group reset leaves every reward state ready for today): a claim of the daily
 * login reward adds its items, stores the claim completed with no given items left and sends the accepted reward; the
 * claim stays completed after a new login the same day, shown claimed with no balloon while the straight days reward is
 * not ready; a reward not ready or already completed and an unknown reward
 * id give nothing; a double claim in the same tick gives the reward once; two players claim their own rewards, each
 * claim stored apart, and a claim sends nothing to the other player; a reward with an unknown item key stays claimable
 * with no accepted reward; a reward with no items is completed with nothing given; a reward with a non stackable item
 * quantity above 1 is completed (it gives one unit, ISSUE #150); a claim that fails on one item keeps the given items and a retry does not give
 * them again; and a claim sent right before the page reloads is stored and shown claimed on the next login.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { RewardsSteps } = require('./helpers/rewards-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { RewardsConst } = require('../../lib/rewards/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsClaims
{

    static COINS = 'coins';
    static BRANCH = 'branch';
    static UNKNOWN_ITEM_KEY = 'e2e-unknown-item';
    static BRANCHES_QUANTITY = 2;

    static async enter(context, playersCount = 1)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * (playersCount + 2), context.longRun));
        let dailyReward = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        expect(dailyReward, 'The daily login reward event is stored').toBeTruthy();
        return {
            players: await TradeSteps.enterPlayers(context, playersCount),
            dailyReward,
            dailyCoins: sc.get(sc.toJson(dailyReward.event_data, {}).items, TestRewardsClaims.COINS, 0)
        };
    }

    static async expectNoAccepted(player, message)
    {
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await RoomMessagesRecorder.fetchMessages(player.page, RewardsConst.ACTIONS.ACCEPTED_REWARD), message).toEqual([]);
    }

    static async runClaimTest(context)
    {
        let {players: [player], dailyReward, dailyCoins} = await TestRewardsClaims.enter(context);
        let coins = await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await TradeSteps.expectQuantity(context, player, TestRewardsClaims.COINS, coins + dailyCoins, 'The claim adds the reward items');
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: true}, 'Completed');
        expect(
            await RewardsSteps.fetchStoredState(context.gameConfig, player.playerId, dailyReward.id),
            'No given items left'
        ).not.toHaveProperty('givenItems');
        await TradeSteps.waitForMessages(player, RewardsConst.ACTIONS.ACCEPTED_REWARD, 1);
        let [accepted] = await RoomMessagesRecorder.fetchMessages(player.page, RewardsConst.ACTIONS.ACCEPTED_REWARD);
        expect(accepted.acceptedReward.id, 'The accepted reward is sent').toBe(dailyReward.id);
    }

    static async runSameDayLoginTest(context)
    {
        let {players: [player], dailyReward, dailyCoins} = await TestRewardsClaims.enter(context);
        let coins = await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: true}, 'Claimed');
        await player.page.reload();
        await Login.loginRootPlayer(player.page, context.gameConfig, context.longRun);
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: true}, 'Still claimed');
        expect(await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS), 'Not given again').toBe(coins + dailyCoins);
        await expect(player.page.locator('.reward-'+dailyReward.id+'.reward-inactive'), 'Shown claimed').toHaveCount(1);
        let straightReward = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.STRAIGHT_DAYS_LOGIN);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, straightReward.id, {ready: false}, 'Not ready');
        await expect(player.page.locator(Selectors.rewards.notificationBalloon), 'No claimable reward, no balloon').toBeHidden();
    }

    static async runNotGivenTest(context)
    {
        let {players: [player], dailyReward} = await TestRewardsClaims.enter(context);
        let coins = await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS);
        let stateFilters = {player_id: player.playerId, rewards_events_id: dailyReward.id};
        await E2eSeedAndRestoreApi.updateWithPreserve(context.gameConfig, context.e2eGroup, 'rewardsEventsState', stateFilters, {
            state: sc.toJsonString({ready: false, complete: false})
        });
        await RewardsSteps.claim(player, [dailyReward.id, RewardsSteps.UNKNOWN_REWARD_ID]);
        await TestRewardsClaims.expectNoAccepted(player, 'No reward accepted');
        expect(await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS), 'Nothing given').toBe(coins);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: false}, 'Not ready');
    }

    static async runDoubleClaimTest(context)
    {
        let {players: [player], dailyReward, dailyCoins} = await TestRewardsClaims.enter(context);
        let coins = await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS);
        await RewardsSteps.claim(player, [dailyReward.id, dailyReward.id]);
        await TradeSteps.expectQuantity(context, player, TestRewardsClaims.COINS, coins + dailyCoins, 'Given');
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS), 'Given once').toBe(coins + dailyCoins);
        expect(await RoomMessagesRecorder.fetchMessages(player.page, RewardsConst.ACTIONS.ACCEPTED_REWARD), 'Accepted once')
            .toHaveLength(1);
    }

    static async runTwoPlayersTest(context)
    {
        let {players: [first, second], dailyReward, dailyCoins} = await TestRewardsClaims.enter(context, 2);
        let coins = await TradeSteps.fetchQuantity(context, second, TestRewardsClaims.COINS);
        await RewardsSteps.claim(first, [dailyReward.id]);
        await TradeSteps.waitForMessages(first, RewardsConst.ACTIONS.ACCEPTED_REWARD, 1);
        await second.page.waitForTimeout(TradeSteps.SETTLE_MS);
        for(let act of [RewardsConst.ACTIONS.UPDATE, RewardsConst.ACTIONS.ACCEPTED_REWARD]){
            expect(await RoomMessagesRecorder.fetchMessages(second.page, act), 'The other player gets nothing').toEqual([]);
        }
        await RewardsSteps.expectStoredState(context.gameConfig, second.playerId, dailyReward.id, {complete: false}, 'Apart');
        await RewardsSteps.claim(second, [dailyReward.id]);
        await TradeSteps.expectQuantity(context, second, TestRewardsClaims.COINS, coins + dailyCoins, 'Its own claim');
        await RewardsSteps.expectStoredState(context.gameConfig, second.playerId, dailyReward.id, {complete: true}, 'Stored');
    }

    static async runUnknownItemTest(context)
    {
        let dailyReward = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        await RewardsSteps.changeRewardEvent(context, dailyReward.id, {}, {items: {[TestRewardsClaims.UNKNOWN_ITEM_KEY]: 1}});
        let {players: [player]} = await TestRewardsClaims.enter(context);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await TestRewardsClaims.expectNoAccepted(player, 'No accepted reward');
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {
            ready: true,
            complete: false
        }, 'The reward stays claimable');
    }

    static async runNoItemsTest(context)
    {
        let dailyReward = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        await RewardsSteps.changeRewardEvent(context, dailyReward.id, {}, {}, ['items']);
        let {players: [player]} = await TestRewardsClaims.enter(context);
        let coins = await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: true}, 'Completed');
        expect(await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS), 'Nothing given').toBe(coins);
    }

    static async runNonStackableQuantityTest(context)
    {
        let dailyReward = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        await RewardsSteps.changeRewardEvent(context, dailyReward.id, {}, {
            items: {[TestRewardsClaims.BRANCH]: TestRewardsClaims.BRANCHES_QUANTITY}
        });
        let {players: [player]} = await TestRewardsClaims.enter(context);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: true}, 'Completed');
    }

    static async runPartialGiveTest(context)
    {
        let dailyReward = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        await RewardsSteps.changeRewardEvent(context, dailyReward.id, {}, {
            items: {[TestRewardsClaims.COINS]: 1, [TestRewardsClaims.UNKNOWN_ITEM_KEY]: 1}
        });
        let {players: [player]} = await TestRewardsClaims.enter(context);
        let coins = await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await TradeSteps.expectQuantity(context, player, TestRewardsClaims.COINS, coins + 1, 'The first item is given');
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {
            complete: false,
            givenItems: {[TestRewardsClaims.COINS]: true}
        }, 'The given item is stored and the reward stays claimable');
        await RewardsSteps.claim(player, [dailyReward.id]);
        await TestRewardsClaims.expectNoAccepted(player, 'The retry still fails on the unknown item');
        expect(await TradeSteps.fetchQuantity(context, player, TestRewardsClaims.COINS), 'The retry does not give it again')
            .toBe(coins + 1);
    }

    static async runClaimBeforeReloadTest(context)
    {
        let {players: [player], dailyReward, dailyCoins} = await TestRewardsClaims.enter(context);
        let storedCoins = await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, player.playerName, TestRewardsClaims.COINS);
        await RewardsSteps.claim(player, [dailyReward.id]);
        await player.page.reload();
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, dailyReward.id, {complete: true}, 'Stored');
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, player.playerName, TestRewardsClaims.COINS),
            {message: 'The reward items are stored', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(storedCoins + dailyCoins);
        await Login.loginRootPlayer(player.page, context.gameConfig, context.longRun);
        await expect(player.page.locator('.reward-'+dailyReward.id+'.reward-inactive'), 'Shown claimed').toHaveCount(1, {
            timeout: TimeConstants.SERVER_RESPONSE
        });
    }

    static run()
    {
        test.describe('Rewards Claims', () => {
            test('claim gives the reward items and stores the completed claim', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runClaimTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('claimed reward stays completed after a new login the same day', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runSameDayLoginTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward not ready and unknown reward give nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runNotGivenTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('double claim gives the reward once', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runDoubleClaimTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two players claim their own rewards apart', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runTwoPlayersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward with an unknown item stays claimable', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runUnknownItemTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward with no items is completed with nothing given', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runNoItemsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward with a non stackable item quantity is completed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runNonStackableQuantityTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('failed item give keeps the given items for the retry', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runPartialGiveTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('claim before a reload is stored and shown claimed', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsClaims.runClaimBeforeReloadTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRewardsClaims.run();
