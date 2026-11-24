/**
 *
 * Reldens - Test Scores Period Reset Time Zones
 *
 * Tests the scores period reset of servers sharing the storage in different time zones (ISSUE #474): the period keys
 * use the server local time, so for every period (daily, weekly and monthly) a stored key ahead of this server key (reset
 * by a server in a later time zone) is never reset back: the scores are sent once and this server resets again only
 * when its own next period starts, and the first check of a server behind the stored key only observes it. An ahead
 * pending claim is waited at any age until this server reaches its period, then the stale claim is completed with its
 * claimed ids. An older stored key resets, and a stored key of another period format (the period changed) resets even
 * when it sorts after the current key. The check dates are built with the local Date constructor and the keys with
 * ScoresPeriodKeyBuilder, so they are the same in any server time zone; every next date is a whole period later. Every
 * check is read with the deleted ids, the stored period values, the scene room broadcasts and the observed period.
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresPeriodResetBuilder } = require('./fixtures/scores-period-reset-builder');
const { ScoresPeriodKeyBuilder } = require('../lib/scores/server/scores-period-key-builder');
const { ScoresConst } = require('../lib/scores/constants');

class TestScoresPeriodResetTimeZones extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ScoresPeriodResetBuilder();
        this.serverDate = new Date(2026, 9, 17, 22, 0, 0);
        this.periodsDates = {
            [ScoresConst.RESET.PERIODS.DAILY]: {
                olderDate: new Date(2026, 9, 16, 10, 0, 0),
                aheadDate: new Date(2026, 9, 18, 10, 0, 0),
                nextOwnDate: new Date(2026, 9, 19, 10, 0, 0)
            },
            [ScoresConst.RESET.PERIODS.WEEKLY]: {
                olderDate: new Date(2026, 9, 10, 10, 0, 0),
                aheadDate: new Date(2026, 9, 24, 10, 0, 0),
                nextOwnDate: new Date(2026, 9, 31, 10, 0, 0)
            },
            [ScoresConst.RESET.PERIODS.MONTHLY]: {
                olderDate: new Date(2026, 8, 17, 10, 0, 0),
                aheadDate: new Date(2026, 10, 17, 10, 0, 0),
                nextOwnDate: new Date(2026, 11, 17, 10, 0, 0)
            }
        };
        this.changedPeriods = [
            [ScoresConst.RESET.PERIODS.DAILY, ScoresConst.RESET.PERIODS.WEEKLY],
            [ScoresConst.RESET.PERIODS.DAILY, ScoresConst.RESET.PERIODS.MONTHLY],
            [ScoresConst.RESET.PERIODS.WEEKLY, ScoresConst.RESET.PERIODS.DAILY],
            [ScoresConst.RESET.PERIODS.WEEKLY, ScoresConst.RESET.PERIODS.MONTHLY],
            [ScoresConst.RESET.PERIODS.MONTHLY, ScoresConst.RESET.PERIODS.DAILY],
            [ScoresConst.RESET.PERIODS.MONTHLY, ScoresConst.RESET.PERIODS.WEEKLY]
        ];
        this.storedScoresMessages = this.builder.expectedScoresMessages(
            [{playerName: 'player-7', score: this.builder.storedPlayerScore}],
            this.builder.storedPlayerScore
        );
        this.emptyScoresMessages = this.builder.expectedScoresMessages([], ScoresConst.RESET.DEFAULTS.RESET_SCORE);
    }

    async assertEveryCase(testCases, runCase)
    {
        let casesResults = [];
        let expectedResults = [];
        for(let testCase of testCases){
            let caseRun = await runCase(testCase);
            casesResults.push(caseRun.result);
            expectedResults.push(caseRun.expected);
        }
        this.assert.deepStrictEqual(casesResults, expectedResults);
    }

    async checkOnDate(setup, checkDate)
    {
        return [
            await setup.scoresPeriodReset.check(checkDate),
            [...setup.repositories.scores.deletes],
            [...setup.repositories.config.storedValues],
            [...setup.sceneRoom.broadcasts],
            setup.scoresPeriodReset.observedPeriodKey
        ];
    }

    expectedReset(periodKey, checkDate, broadcasts)
    {
        return [
            {periodKey, resetScores: true},
            [this.builder.storedScoreId],
            [
                this.builder.buildPendingValue(
                    periodKey,
                    checkDate.getTime(),
                    this.builder.storedScoreId,
                    this.builder.storedDetailId
                ),
                periodKey
            ],
            broadcasts,
            periodKey
        ];
    }

    async testAheadStoredKeySendsTheScoresOnceAndResetsOnlyOnTheOwnNextPeriod()
    {
        await this.test('a stored key ahead of this server key sends the scores once and resets only on the own next period', async () => {
            await this.assertEveryCase(Object.keys(this.periodsDates), async (period) => {
                let periodDates = this.periodsDates[period];
                let serverKey = ScoresPeriodKeyBuilder.build(period, this.serverDate);
                let aheadKey = ScoresPeriodKeyBuilder.build(period, periodDates.aheadDate);
                let nextOwnKey = ScoresPeriodKeyBuilder.build(period, periodDates.nextOwnDate);
                let setup = this.builder.createSetup(serverKey, {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: period});
                let firstCheck = await this.checkOnDate(setup, this.serverDate);
                setup.repositories.config.lastPeriodRow.value = aheadKey;
                return {
                    result: [
                        aheadKey > serverKey,
                        firstCheck,
                        [
                            await this.checkOnDate(setup, this.serverDate),
                            await this.checkOnDate(setup, this.serverDate),
                            await this.checkOnDate(setup, periodDates.aheadDate)
                        ],
                        [...setup.sceneRoom.client.sentMessages],
                        await this.checkOnDate(setup, periodDates.nextOwnDate)
                    ],
                    expected: [
                        true,
                        [false, [], [], [], serverKey],
                        [
                            [
                                {periodKey: aheadKey, resetScores: false, refreshedScores: true},
                                [],
                                [],
                                this.storedScoresMessages.broadcasts,
                                aheadKey
                            ],
                            [false, [], [], this.storedScoresMessages.broadcasts, aheadKey],
                            [false, [], [], this.storedScoresMessages.broadcasts, aheadKey]
                        ],
                        this.storedScoresMessages.playerMessages,
                        this.expectedReset(
                            nextOwnKey,
                            periodDates.nextOwnDate,
                            [...this.storedScoresMessages.broadcasts, ...this.emptyScoresMessages.broadcasts]
                        )
                    ]
                };
            });
        });
    }

    async testFirstCheckBehindTheStoredKeyOnlyObservesIt()
    {
        await this.test('the first check of a server behind the stored key only observes it, sending and resetting nothing', async () => {
            await this.assertEveryCase(Object.keys(this.periodsDates), async (period) => ({
                result: await this.checkOnDate(
                    this.builder.createSetup(
                        ScoresPeriodKeyBuilder.build(period, this.periodsDates[period].aheadDate),
                        {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: period}
                    ),
                    this.serverDate
                ),
                expected: [false, [], [], [], ScoresPeriodKeyBuilder.build(period, this.periodsDates[period].aheadDate)]
            }));
        });
    }

    async testAheadPendingClaimIsWaitedUntilTheOwnPeriodReachesIt()
    {
        await this.test('an ahead pending claim is waited at any age and completed with its claimed ids once this server reaches its period', async () => {
            let newPeriodRow = {id: 2, player_id: 8, total_score: 5, related_players: {name: 'player-8'}};
            let waitedCheck = [false, [], [], [], false];
            await this.assertEveryCase(Object.keys(this.periodsDates), async (period) => {
                let aheadDate = this.periodsDates[period].aheadDate;
                let aheadKey = ScoresPeriodKeyBuilder.build(period, aheadDate);
                let setup = this.builder.createSetup(
                    this.builder.buildPendingValue(aheadKey, 1000, this.builder.storedScoreId, this.builder.storedDetailId),
                    {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: period}
                );
                setup.repositories.scores.rows.push(newPeriodRow);
                return {
                    result: [
                        [await this.checkOnDate(setup, this.serverDate), await this.checkOnDate(setup, this.serverDate)],
                        await this.checkOnDate(setup, aheadDate),
                        setup.repositories.scores.rows
                    ],
                    expected: [
                        [waitedCheck, waitedCheck],
                        this.expectedReset(
                            aheadKey,
                            aheadDate,
                            this.builder.expectedScoresMessages(
                                [{playerName: 'player-8', score: 5}],
                                ScoresConst.RESET.DEFAULTS.RESET_SCORE
                            ).broadcasts
                        ),
                        [newPeriodRow]
                    ]
                };
            });
        });
    }

    async testOlderStoredKeyResetsEveryPeriod()
    {
        await this.test('an older stored key of every period resets the scores and sends the empty scores', async () => {
            await this.assertEveryCase(Object.keys(this.periodsDates), async (period) => ({
                result: await this.checkOnDate(
                    this.builder.createSetup(
                        ScoresPeriodKeyBuilder.build(period, this.periodsDates[period].olderDate),
                        {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: period}
                    ),
                    this.serverDate
                ),
                expected: this.expectedReset(
                    ScoresPeriodKeyBuilder.build(period, this.serverDate),
                    this.serverDate,
                    this.emptyScoresMessages.broadcasts
                )
            }));
        });
    }

    async testStoredKeyOfAnotherPeriodFormatResets()
    {
        await this.test('a stored key of another period format resets the scores even when it sorts after the current key', async () => {
            await this.assertEveryCase(this.changedPeriods, async ([storedPeriod, serverPeriod]) => ({
                result: await this.checkOnDate(
                    this.builder.createSetup(
                        ScoresPeriodKeyBuilder.build(storedPeriod, this.periodsDates[storedPeriod].aheadDate),
                        {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: serverPeriod}
                    ),
                    this.serverDate
                ),
                expected: this.expectedReset(
                    ScoresPeriodKeyBuilder.build(serverPeriod, this.serverDate),
                    this.serverDate,
                    this.emptyScoresMessages.broadcasts
                )
            }));
        });
    }

}

module.exports.TestScoresPeriodResetTimeZones = TestScoresPeriodResetTimeZones;
