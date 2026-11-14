/**
 *
 * Reldens - Test Scores Period Reset Claims
 *
 * Tests the scores period reset claims and sends with the builder stubs: a connected player with a row created after
 * the claim gets its kept score, a second check right after a reset deletes and sends nothing more, a new period with
 * no stored rows resets up to the id 0 and sends the empty scores, a stale claim with a not integer claimed id resets
 * up to the current ids, and the started check interval runs the check (the interval callback is captured, so no
 * timer is awaited).
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresPeriodResetBuilder } = require('./fixtures/scores-period-reset-builder');
const { ScoresConst } = require('../lib/scores/constants');

class TestScoresPeriodResetClaims extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ScoresPeriodResetBuilder();
    }

    async testConnectedPlayerWithARowAfterTheClaimGetsItsScore()
    {
        await this.test('a connected player with a row created after the claim gets its kept score', async () => {
            let setup = this.builder.createSetup(this.builder.storedPeriodKey);
            let keptScore = 5;
            this.builder.addRowOnDelete(setup.repositories.scores, {
                id: 3,
                player_id: 7,
                total_score: keptScore,
                related_players: {name: 'player-7'}
            });
            let checkResult = await setup.scoresPeriodReset.check(this.builder.checkDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.builder.checkPeriodKey, resetScores: true});
            let expectedMessages = this.builder.expectedScoresMessages(
                [{playerName: 'player-7', score: keptScore}],
                keptScore
            );
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, expectedMessages.broadcasts);
            this.assert.deepStrictEqual(setup.sceneRoom.client.sentMessages, expectedMessages.playerMessages);
        });
    }

    async testSecondCheckAfterTheResetDeletesNothingMore()
    {
        await this.test('a second check right after a reset deletes nothing more and sends nothing', async () => {
            let setup = this.builder.createSetup(this.builder.storedPeriodKey);
            await setup.scoresPeriodReset.check(this.builder.checkDate);
            setup.repositories.scores.rows.push({id: 2, player_id: 8, total_score: 5});
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.builder.checkDate), false);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [this.builder.storedScoreId]);
            this.assert.deepStrictEqual(setup.repositories.scores.rows.map(row => row.id), [2]);
            this.assert.strictEqual(setup.sceneRoom.broadcasts.length, 1);
        });
    }

    async testNoStoredRowsResetsUpToIdZero()
    {
        await this.test('a new period with no scores and no details stores the period and sends the empty scores', async () => {
            let setup = this.builder.createSetup(
                this.builder.storedPeriodKey,
                {[ScoresConst.RESET.CONFIG_PATHS.RESET_DETAILS]: true},
                []
            );
            setup.repositories.scoresDetail.rows = [];
            let checkResult = await setup.scoresPeriodReset.check(this.builder.checkDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.builder.checkPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, [
                this.builder.buildPendingValue(this.builder.checkPeriodKey, this.builder.checkDate.getTime(), 0, 0),
                this.builder.checkPeriodKey
            ]);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [0]);
            this.assert.deepStrictEqual(setup.repositories.scoresDetail.deletes, [0]);
            let emptyScoresMessages = this.builder.expectedScoresMessages([], ScoresConst.RESET.DEFAULTS.RESET_SCORE);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, emptyScoresMessages.broadcasts);
            this.assert.deepStrictEqual(setup.sceneRoom.client.sentMessages, emptyScoresMessages.playerMessages);
        });
    }

    async testPendingClaimWithNotIntegerIdsUsesTheCurrentIds()
    {
        await this.test('a stale pending claim with a not integer scores or details id resets up to the current ids', async () => {
            let checkTime = this.builder.checkDate.getTime();
            let staleClaimedAt = checkTime - ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS;
            for(let claimedIds of [[1.5, this.builder.storedDetailId], [this.builder.storedScoreId, 'x']]){
                let setup = this.builder.createSetup(
                    this.builder.buildPendingValue(this.builder.checkPeriodKey, staleClaimedAt, ...claimedIds),
                    {},
                    [{id: 1, player_id: 7}, {id: 2, player_id: 8}]
                );
                let checkResult = await setup.scoresPeriodReset.check(this.builder.checkDate);
                this.assert.deepStrictEqual(checkResult, {periodKey: this.builder.checkPeriodKey, resetScores: true});
                this.assert.deepStrictEqual(setup.repositories.scores.deletes, [2], 'Current ids for '+claimedIds);
                this.assert.strictEqual(
                    setup.repositories.config.storedValues[0],
                    this.builder.buildPendingValue(this.builder.checkPeriodKey, checkTime, 2, this.builder.storedDetailId)
                );
            }
        });
    }

    async testTheCheckIntervalRunsTheCheck()
    {
        await this.test('the started check interval runs the period check with the current date', async () => {
            let setup = this.builder.createSetup(this.builder.storedPeriodKey, {
                [ScoresConst.RESET.CONFIG_PATHS.CHECK_INTERVAL_MS]: 25
            });
            let scheduled = {};
            let originalSetInterval = global.setInterval;
            global.setInterval = (callback, intervalMs) => {
                Object.assign(scheduled, {callback, intervalMs});
                return {unref: () => true};
            };
            setup.scoresPeriodReset.start();
            global.setInterval = originalSetInterval;
            let checkedDates = [];
            setup.scoresPeriodReset.check = (checkDate) => checkedDates.push(checkDate);
            scheduled.callback();
            setup.scoresPeriodReset.stop();
            this.assert.strictEqual(scheduled.intervalMs, 25);
            this.assert.deepStrictEqual(checkedDates.map(checkDate => checkDate instanceof Date), [true]);
        });
    }

}

module.exports.TestScoresPeriodResetClaims = TestScoresPeriodResetClaims;
