/**
 *
 * Reldens - Test Rewards Login Days
 *
 * Tests the login rewards state of a group player on a new login (after a first login the stored state of the reward
 * is set and the past login days are stored for its user, then the page is reloaded and the player logs in again): a
 * daily reward completed or partially given on the previous day is claimable again with its given items cleared; a
 * straight days reward is ready with logins on consecutive days, not ready with too few login days or with a broken
 * streak, and not ready again on the day after its claim; a reward event with no action in its live event data changes
 * no state; and the rewards message that arrives before the UI scene exists is queued and rendered once the scene is
 * created.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { RewardsSteps } = require('./helpers/rewards-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRewardsLoginDays
{

    static LOGIN_TIME = ' 12:00:00';
    static GIVEN_ITEMS = {'e2e-given-item': true};
    static FIRST_EVENT_DATA_PATH = 'rewards/package/rewardsEventsHandler/activeRewards/0/eventData';

    static formatDay(daysAgo)
    {
        let day = new Date();
        day.setDate(day.getDate() - daysAgo);
        return sc.formatDate(day, 'Y-m-d');
    }

    static fetchCases(today, yesterday)
    {
        return {
            dailyCompleted: {
                action: RewardsSteps.DAILY_LOGIN,
                storedState: {ready: true, complete: true, date: yesterday},
                expectedState: {ready: true, complete: false, date: today},
                shownAs: Selectors.rewards.active
            },
            dailyPartiallyGiven: {
                action: RewardsSteps.DAILY_LOGIN,
                storedState: {ready: true, complete: false, date: yesterday, givenItems: TestRewardsLoginDays.GIVEN_ITEMS},
                expectedState: {ready: true, complete: false, date: today},
                shownAs: Selectors.rewards.active
            },
            straightConsecutive: {
                action: RewardsSteps.STRAIGHT_DAYS_LOGIN,
                storedState: {ready: false, complete: false},
                loginsDaysAgo: [1],
                expectedState: {ready: true, complete: false, date: today},
                shownAs: Selectors.rewards.active
            },
            straightTooFew: {
                action: RewardsSteps.STRAIGHT_DAYS_LOGIN,
                storedState: {ready: true, complete: false},
                expectedState: {ready: false, complete: false},
                shownAs: Selectors.rewards.inactive
            },
            straightBroken: {
                action: RewardsSteps.STRAIGHT_DAYS_LOGIN,
                storedState: {ready: false, complete: false},
                loginsDaysAgo: [2],
                expectedState: {ready: false, complete: false},
                shownAs: Selectors.rewards.inactive
            },
            straightClaimedYesterday: {
                action: RewardsSteps.STRAIGHT_DAYS_LOGIN,
                storedState: {ready: true, complete: true, date: yesterday},
                loginsDaysAgo: [1],
                expectedState: {ready: false, complete: false, date: yesterday},
                shownAs: Selectors.rewards.inactive
            },
            dailyWithoutAction: {
                action: RewardsSteps.DAILY_LOGIN,
                storedState: {ready: true, complete: true, date: yesterday},
                liveChanges: [{path: TestRewardsLoginDays.FIRST_EVENT_DATA_PATH, key: 'action', value: ''}],
                expectedState: {ready: true, complete: true, date: yesterday},
                shownAs: Selectors.rewards.inactive
            }
        };
    }

    static async runLoginDaysTest(context, caseKey)
    {
        let loginCase = Object.assign(
            {loginsDaysAgo: [], liveChanges: []},
            TestRewardsLoginDays.fetchCases(TestRewardsLoginDays.formatDay(0), TestRewardsLoginDays.formatDay(1))[caseKey]
        );
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        let gameConfig = context.gameConfig;
        let rewardEvent = await RewardsSteps.fetchRewardEvent(gameConfig, loginCase.action);
        let player = (await TradeSteps.enterPlayers(context, 1)).shift();
        await RewardsSteps.presetStoredState(context, player.playerId, rewardEvent.id, loginCase.storedState);
        let userId = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'players', {id: player.playerId})].shift().user_id;
        for(let daysAgo of loginCase.loginsDaysAgo){
            await E2eSeedAndRestoreApi.createRow(gameConfig, context.e2eGroup, 'usersLogin', {
                user_id: userId,
                login_date: TestRewardsLoginDays.formatDay(daysAgo)+TestRewardsLoginDays.LOGIN_TIME
            });
        }
        for(let liveChange of loginCase.liveChanges){
            let changed = await GameplayE2eStateApi.changeFeatureProperty(
                gameConfig,
                context.e2eGroup,
                liveChange.path,
                liveChange.key,
                liveChange.value
            );
            expect(changed.error, 'The live reward event is changed').toBeUndefined();
        }
        await player.page.reload();
        await Login.loginRootPlayer(player.page, gameConfig, context.longRun);
        await player.page.waitForTimeout(TradeSteps.SETTLE_MS);
        await expect.poll(
            async () => await RewardsSteps.fetchStoredState(gameConfig, player.playerId, rewardEvent.id),
            {message: 'The stored reward state after the new login', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(loginCase.expectedState);
        await expect(
            player.page.locator(Selectors.rewards.reward(rewardEvent.id)+loginCase.shownAs),
            'The reward is shown with its new state'
        ).toHaveCount(1);
    }

    static async runQueuedMessageTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        let player = (await TradeSteps.enterPlayers(context, 1)).shift();
        await expect(player.page.locator(Selectors.rewards.content), 'The queued rewards are rendered').toHaveCount(1);
        expect(
            await player.page.evaluate(() => window.reldens.activeRoomEvents.rewardsMessagesQueue),
            'The rewards message was queued before the UI scene and processed after it'
        ).toEqual([]);
    }

    static run()
    {
        test.describe('Rewards Login Days', () => {
            test('daily reward completed the day before is claimable again', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'dailyCompleted'
                );
            });
            test('daily reward partially given the day before is claimable with its given items cleared', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'dailyPartiallyGiven'
                );
            });
            test('straight days reward ready with logins on consecutive days', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'straightConsecutive'
                );
            });
            test('straight days reward not ready with too few login days', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'straightTooFew'
                );
            });
            test('straight days reward not ready with a broken streak', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'straightBroken'
                );
            });
            test('straight days reward claimed the day before is not ready again', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'straightClaimedYesterday'
                );
            });
            test('reward event without action changes no state', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runLoginDaysTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'dailyWithoutAction'
                );
            });
            test('rewards message before the UI scene is queued and rendered', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestRewardsLoginDays.runQueuedMessageTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRewardsLoginDays.run();
