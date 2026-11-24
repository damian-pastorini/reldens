/**
 *
 * Reldens - Test Login State Handler
 *
 * Tests the reward state resets of the login rewards (the claim date, the partial claim items and a new state), and
 * the straight days logins counted from the local start of the day after the claim day (ISSUE #452): a login at 00:30
 * or at 00:00 local of the next day counts, a login on the claim day itself does not. A ready straight days reward
 * not claimed yet (partly given or not) stays ready with nothing saved on the next joins of that day and of the next
 * days (ISSUE #476), and a claimed one counts the streak again from the day after its claim date: ready again on the
 * new date with enough days, not ready keeping its claim date without them.
 *
 */

const { BaseTest } = require('./base-test');
const { LoginStateHandler } = require('../lib/rewards/server/event-handlers/login-state-handler');
const { sc } = require('@reldens/utils');

class TestLoginStateHandler extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.rewardId = 1;
        this.playerId = 7;
        this.stateId = 101;
        this.claimDate = '2026-10-27';
        this.nextDate = '2026-10-28';
        this.givenItems = {coins: true};
    }

    createHandler(savedStates)
    {
        return new LoginStateHandler({
            rewardsProvider: {},
            rewardsEventsUpdater: {
                updateStateById: async (stateId, state, rewardId, playerId) => {
                    savedStates.push({isNewState: !stateId, state: sc.toJson(state, {}), rewardId, playerId});
                    return true;
                }
            },
            config: {getWithoutLogs: (path, defaultValue) => defaultValue}
        });
    }

    localDate(daysFromToday, hours, minutes)
    {
        let localDate = new Date();
        localDate.setDate(localDate.getDate() + daysFromToday);
        localDate.setHours(hours, minutes, 0, 0);
        return localDate;
    }

    async processOneStraightDay(lastClaimedDate, loginDate)
    {
        let savedStates = [];
        await this.createHandler(savedStates).processStraightDaysLogin(
            {id: this.rewardId, eventData: {days: 1}},
            {id: this.stateId, state: sc.toJsonString({ready: false, date: lastClaimedDate, complete: true})},
            {userModel: {related_users_login: [{login_date: loginDate}]}, loggedPlayer: {player_id: this.playerId}},
            sc.formatDate(new Date(), 'Y-m-d'),
            lastClaimedDate
        );
        return savedStates.map(savedState => savedState.state.ready);
    }

    async testTheStraightDaysCountTheLoginsFromTheLocalDayAfterTheClaim()
    {
        await this.test('the straight days count the logins from the local start of the day after the claim day', async () => {
            let yesterday = sc.formatDate(this.localDate(-1, 0, 0), 'Y-m-d');
            let today = sc.formatDate(this.localDate(0, 0, 0), 'Y-m-d');
            this.assert.deepStrictEqual(
                [
                    await this.processOneStraightDay(yesterday, this.localDate(0, 0, 30)),
                    await this.processOneStraightDay(yesterday, this.localDate(0, 0, 0)),
                    await this.processOneStraightDay(today, this.localDate(0, 0, 30))
                ],
                [[true], [true], [false]]
            );
        });
    }

    async processStraightDays(storedState, requiredDays, loginsDaysFromToday)
    {
        let processSetup = {savedStates: []};
        processSetup.result = await this.createHandler(processSetup.savedStates).processStraightDaysLogin(
            {id: this.rewardId, eventData: {days: requiredDays}},
            {id: this.stateId, state: sc.toJsonString(storedState), mappedState: Object.assign({}, storedState)},
            {
                userModel: {related_users_login: loginsDaysFromToday.map(
                    (daysFromToday) => ({login_date: this.localDate(daysFromToday, 10, 0)})
                )},
                loggedPlayer: {player_id: this.playerId}
            },
            sc.formatDate(this.localDate(0, 0, 0), 'Y-m-d'),
            storedState.date
        );
        return [processSetup.result, processSetup.savedStates.map(savedState => savedState.state)];
    }

    async testAReadyNotClaimedStraightDaysRewardStaysReady()
    {
        await this.test('a ready not claimed straight days reward stays ready on the next joins of that day and the next days until it is claimed', async () => {
            let today = sc.formatDate(this.localDate(0, 0, 0), 'Y-m-d');
            let yesterday = sc.formatDate(this.localDate(-1, 0, 0), 'Y-m-d');
            let threeDaysAgo = sc.formatDate(this.localDate(-3, 0, 0), 'Y-m-d');
            this.assert.deepStrictEqual(
                [
                    await this.processStraightDays({ready: true, date: today, complete: false}, 2, [-1, 0]),
                    await this.processStraightDays({ready: true, date: today, complete: false}, 2, [0]),
                    await this.processStraightDays(
                        {ready: true, date: yesterday, complete: false, givenItems: this.givenItems},
                        2,
                        [-2, -1, 0]
                    ),
                    await this.processStraightDays({ready: true, date: threeDaysAgo, complete: false}, 2, [])
                ],
                [[true, []], [true, []], [true, []], [true, []]]
            );
        });
    }

    async testAClaimedStraightDaysRewardCountsTheStreakFromTheDayAfterItsDate()
    {
        await this.test('a claimed straight days reward counts the streak again from the day after its claim date', async () => {
            let today = sc.formatDate(this.localDate(0, 0, 0), 'Y-m-d');
            let yesterday = sc.formatDate(this.localDate(-1, 0, 0), 'Y-m-d');
            let twoDaysAgo = sc.formatDate(this.localDate(-2, 0, 0), 'Y-m-d');
            this.assert.deepStrictEqual(
                [
                    await this.processStraightDays({ready: true, date: twoDaysAgo, complete: true}, 2, [-2, -1, 0]),
                    await this.processStraightDays({ready: true, date: yesterday, complete: true}, 2, [-2, -1, 0])
                ],
                [
                    [true, [{ready: true, date: today, complete: false}]],
                    [false, [{ready: false, date: yesterday, complete: false}]]
                ]
            );
        });
    }

    async resetState(storedState, isReady, today)
    {
        let savedStates = [];
        let loginStateHandler = this.createHandler(savedStates);
        await loginStateHandler.resetRewardState(
            null === storedState ? null : {id: this.stateId, state: sc.toJsonString(storedState)},
            isReady,
            today,
            {id: this.rewardId},
            {loggedPlayer: {player_id: this.playerId}}
        );
        return savedStates;
    }

    async testNewClaimDateClearsThePartialClaimItems()
    {
        await this.test('a new claim date clears the items given by a partial claim of the previous date', async () => {
            let storedState = {ready: true, date: this.claimDate, complete: false, givenItems: this.givenItems};
            this.assert.deepStrictEqual(await this.resetState(storedState, true, this.nextDate), [{
                isNewState: false,
                state: {ready: true, date: this.nextDate, complete: false},
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

    async testSameClaimDateKeepsThePartialClaimItems()
    {
        await this.test('the same claim date keeps the items given by a partial claim', async () => {
            let storedState = {ready: true, date: this.nextDate, complete: false, givenItems: this.givenItems};
            this.assert.deepStrictEqual(await this.resetState(storedState, true, this.nextDate), [{
                isNewState: false,
                state: storedState,
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

    async testNotReadyResetKeepsTheDateAndTheItems()
    {
        await this.test('a not ready reset keeps the stored claim date and the given items', async () => {
            let storedState = {ready: true, date: this.claimDate, complete: true, givenItems: this.givenItems};
            this.assert.deepStrictEqual(await this.resetState(storedState, false, false), [{
                isNewState: false,
                state: {ready: false, date: this.claimDate, complete: false, givenItems: this.givenItems},
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

    async testRewardWithoutStoredStateIsCreated()
    {
        await this.test('a reward without stored state is created ready on the claim date', async () => {
            this.assert.deepStrictEqual(await this.resetState(null, true, this.nextDate), [{
                isNewState: true,
                state: {ready: true, date: this.nextDate, complete: false},
                rewardId: this.rewardId,
                playerId: this.playerId
            }]);
        });
    }

}

module.exports.TestLoginStateHandler = TestLoginStateHandler;
