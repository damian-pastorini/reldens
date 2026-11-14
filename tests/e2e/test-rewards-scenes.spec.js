/**
 *
 * Reldens - Test Rewards Scenes
 *
 * Tests the login rewards across scenes and for guests (exclusive group: the root player walks from the town to the
 * forest, and the guests are new players): the rewards are sent again with the stored states on the scene change; a
 * reward is claimed in another scene than the login one; a guest gets no login reward state with
 * avoidGuestRewardsOnLogin on (its panel shows the cached state of another player, ISSUE #166), and gets the daily
 * reward stored ready with it off (the login state handler value is changed on the live handler since it is read once
 * on start).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { RewardsSteps } = require('./helpers/rewards-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { CharacterCreation } = require('./helpers/character-creation');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { RewardsConst } = require('../../lib/rewards/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsScenes
{

    static LOGIN_HANDLER_PATH = 'rewards/package/rewardsEventsHandler/handlers/login';

    static async enterTown(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + 2 * TimeConstants.NAVIGATION, context.longRun));
        let gameConfig = context.gameConfig;
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        let player = {
            page: context.page,
            playerName: gameConfig.e2ePlayerName,
            playerId: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName}),
            daily: await RewardsSteps.fetchRewardEvent(gameConfig, RewardsSteps.DAILY_LOGIN)
        };
        await expect(
            context.page.locator(Selectors.rewards.reward(player.daily.id)+Selectors.rewards.active),
            'The daily reward is claimable in the town'
        ).toHaveCount(1);
        return player;
    }

    static async walkToForest(context)
    {
        await Login.moveThroughChangePoint(context.page, context.gameConfig, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await RoomMessagesRecorder.start(context.page);
    }

    static async runResentOnSceneChangeTest(context)
    {
        let player = await TestRewardsScenes.enterTown(context);
        await RewardsSteps.presetStoredState(context, player.playerId, player.daily.id, {
            ready: true,
            complete: true,
            date: sc.formatDate(new Date(), 'Y-m-d')
        });
        await TestRewardsScenes.walkToForest(context);
        await expect(
            context.page.locator(Selectors.rewards.reward(player.daily.id)+Selectors.rewards.inactive),
            'The forest join sends the stored claimed state'
        ).toHaveCount(1, {timeout: TimeConstants.SERVER_RESPONSE});
    }

    static async runClaimInForestTest(context)
    {
        let player = await TestRewardsScenes.enterTown(context);
        await TestRewardsScenes.walkToForest(context);
        let rewardItems = sc.toJson(player.daily.event_data, {}).items;
        let itemKey = Object.keys(rewardItems).shift();
        let quantity = await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, player.playerName, itemKey);
        await RewardsSteps.claim(player, [player.daily.id]);
        await RewardsSteps.expectStoredState(context.gameConfig, player.playerId, player.daily.id, {complete: true}, 'Claimed');
        await expect.poll(
            async () => await E2eSeedAndRestoreApi.fetchInventoryQuantity(context.gameConfig, player.playerName, itemKey),
            {message: 'The reward items are given in the forest', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(quantity + rewardItems[itemKey]);
        await TradeSteps.waitForMessages(player, RewardsConst.ACTIONS.ACCEPTED_REWARD, 1);
    }

    static async runGuestRewardsTest(context, avoidGuestRewards, expectedStates, expectedDailyState)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        let changed = await GameplayE2eStateApi.changeFeatureProperty(
            context.gameConfig,
            context.e2eGroup,
            TestRewardsScenes.LOGIN_HANDLER_PATH,
            'avoidGuestRewardsOnLogin',
            avoidGuestRewards
        );
        expect(changed.error, 'The guests login rewards setting is changed').toBeUndefined();
        let daily = await RewardsSteps.fetchRewardEvent(context.gameConfig, RewardsSteps.DAILY_LOGIN);
        let guest = await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.TOWN_ROOM_NAME);
        let guestPlayerId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: guest.playerName});
        await expect(context.page.locator(Selectors.rewards.content), 'The guest rewards are listed').toHaveCount(1);
        await context.page.waitForTimeout(TradeSteps.SETTLE_MS);
        expect(
            await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'rewardsEventsState', {player_id: guestPlayerId}),
            'The guest login reward states'
        ).toHaveLength(expectedStates);
        await RewardsSteps.expectStoredState(context.gameConfig, guestPlayerId, daily.id, expectedDailyState, 'Daily state');
    }

    static run()
    {
        test.describe('Rewards Scenes', () => {
            test('rewards are sent again with the stored states on the scene change', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsScenes.runResentOnSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('reward claimed in another scene', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsScenes.runClaimInForestTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('guest gets no login reward state with avoidGuestRewardsOnLogin on', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsScenes.runGuestRewardsTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    true,
                    0,
                    {}
                );
            });
            test('guest gets the daily reward ready with avoidGuestRewardsOnLogin off', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsScenes.runGuestRewardsTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    false,
                    2,
                    {ready: true, complete: false}
                );
            });
        });
    }

}

TestRewardsScenes.run();
