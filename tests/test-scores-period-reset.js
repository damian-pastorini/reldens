/**
 *
 * Reldens - Test Scores Period Reset
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresPeriodResetBuilder } = require('./fixtures/scores-period-reset-builder');
const { ScoresConst } = require('../lib/scores/constants');

class TestScoresPeriodReset extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.builder = new ScoresPeriodResetBuilder();
        this.resetDate = new Date('2026-10-18T10:00:00Z');
        this.resetPeriodKey = '2026-10-18';
        this.previousPeriodKey = '2026-10-17';
        this.resetPendingValue = this.builder.buildPendingValue(
            this.resetPeriodKey,
            this.resetDate.getTime(),
            this.builder.storedScoreId,
            this.builder.storedDetailId
        );
        this.emptyScoresMessages = this.builder.expectedScoresMessages([], ScoresConst.RESET.DEFAULTS.RESET_SCORE);
    }

    async testDisabledOrRunningResetChecksNothing()
    {
        await this.test('a disabled reset or a check while another runs changes nothing', async () => {
            let disabledSetup = this.builder.createSetup(this.previousPeriodKey, {
                [ScoresConst.RESET.CONFIG_PATHS.ENABLED]: false
            });
            this.assert.strictEqual(await disabledSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(disabledSetup.repositories.config.lastPeriodRow.value, this.previousPeriodKey);
            let runningSetup = this.builder.createSetup(this.previousPeriodKey);
            runningSetup.scoresPeriodReset.isRunning = true;
            this.assert.strictEqual(await runningSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(runningSetup.repositories.scores.deletes, []);
        });
    }

    async testFirstCheckOnlyStoresThePeriod()
    {
        await this.test('the first check only stores the current period key', async () => {
            let setup = this.builder.createSetup('');
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: false});
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, [this.resetPeriodKey]);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, []);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.resetPeriodKey);
        });
    }

    async testFirstObservedPeriodSendsNothing()
    {
        await this.test('the first check of a server in the stored period resets and sends nothing', async () => {
            let setup = this.builder.createSetup(this.resetPeriodKey);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, []);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, []);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.resetPeriodKey);
        });
    }

    async testNewPeriodResetsAndSendsTheEmptyScores()
    {
        await this.test('a new period deletes the claimed scores and sends the empty scores', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(
                setup.repositories.config.storedValues,
                [this.resetPendingValue, this.resetPeriodKey]
            );
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [this.builder.storedScoreId]);
            this.assert.deepStrictEqual(setup.repositories.scores.rows, []);
            this.assert.deepStrictEqual(setup.repositories.scoresDetail.deletes, []);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, this.emptyScoresMessages.broadcasts);
            this.assert.deepStrictEqual(setup.sceneRoom.client.sentMessages, this.emptyScoresMessages.playerMessages);
            this.assert.deepStrictEqual(setup.creatingRoom.broadcasts, []);
            this.assert.deepStrictEqual(setup.gameRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.resetPeriodKey);
            this.assert.strictEqual(setup.scoresPeriodReset.isRunning, false);
        });
    }

    async testResetDetailsAlsoDeletesTheDetails()
    {
        await this.test('the reset with details also deletes the claimed scores details', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey, {
                [ScoresConst.RESET.CONFIG_PATHS.RESET_DETAILS]: true
            });
            await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [this.builder.storedScoreId]);
            this.assert.deepStrictEqual(setup.repositories.scoresDetail.deletes, [this.builder.storedDetailId]);
        });
    }

    async testRowsCreatedAfterTheClaimAreKept()
    {
        await this.test('the scores rows created after the claim are kept by the reset delete', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            let deleteScores = setup.repositories.scores.delete;
            setup.repositories.scores.delete = async (filters) => {
                setup.repositories.scores.rows.push({id: 3, player_id: 8, total_score: 5});
                return await deleteScores(filters);
            };
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(setup.repositories.scores.rows.map(row => row.id), [3]);
        });
    }

    async testPeriodClaimedByAnotherServerResetsNothing()
    {
        await this.test('a period claimed by another server after the read resets nothing', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            let loadOne = setup.repositories.config.loadOne;
            setup.repositories.config.loadOne = async () => {
                let loadedRow = await loadOne();
                setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
                return loadedRow;
            };
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, []);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.previousPeriodKey);
        });
    }

    async testOtherServerResetSendsTheStoredScores()
    {
        await this.test('another server reset makes this server send the stored scores', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(new Date('2026-10-17T22:00:00Z')), false);
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(
                checkResult,
                {periodKey: this.resetPeriodKey, resetScores: false, refreshedScores: true}
            );
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, []);
            let expectedMessages = this.builder.expectedScoresMessages(
                [{playerName: 'player-7', score: this.builder.storedPlayerScore}],
                this.builder.storedPlayerScore
            );
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, expectedMessages.broadcasts);
            this.assert.deepStrictEqual(setup.sceneRoom.client.sentMessages, expectedMessages.playerMessages);
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.sceneRoom.broadcasts.length, 1);
        });
    }

    async testFailedRefreshIsRetried()
    {
        await this.test('a failed scores refresh is sent again on the next check', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            await setup.scoresPeriodReset.check(new Date('2026-10-17T22:00:00Z'));
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            setup.repositories.scores.failedReads = 1;
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.previousPeriodKey);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(checkResult.refreshedScores, true);
            this.assert.strictEqual(setup.sceneRoom.broadcasts.length, 1);
            this.assert.strictEqual(setup.scoresPeriodReset.observedPeriodKey, this.resetPeriodKey);
        });
    }

    async testFailedSendAfterTheResetIsRetried()
    {
        await this.test('a failed scores send after the reset is sent on the next check', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            setup.repositories.scores.failedReads = 1;
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.repositories.config.lastPeriodRow.value, this.resetPeriodKey);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(checkResult.refreshedScores, true);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, this.emptyScoresMessages.broadcasts);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [this.builder.storedScoreId]);
        });
    }

    async testResetInProgressWaitsAndRefreshesAfterIt()
    {
        await this.test('a reset in progress on another server is waited and then sent', async () => {
            let setup = this.builder.createSetup(this.builder.buildPendingValue(
                this.resetPeriodKey,
                this.resetDate.getTime() - 1000,
                this.builder.storedScoreId,
                this.builder.storedDetailId
            ));
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, []);
            this.assert.deepStrictEqual(setup.repositories.config.storedValues, []);
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(checkResult.refreshedScores, true);
            this.assert.strictEqual(setup.sceneRoom.broadcasts.length, 1);
        });
    }

    async testStalePendingResetKeepsTheNewPeriodRows()
    {
        await this.test('a stale pending reset is completed with its claimed ids and keeps new rows', async () => {
            let newPeriodRow = {id: 2, player_id: 8, total_score: 5, related_players: {name: 'player-8'}};
            let staleValue = this.builder.buildPendingValue(
                this.resetPeriodKey,
                this.resetDate.getTime() - ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS,
                this.builder.storedScoreId,
                this.builder.storedDetailId
            );
            let setup = this.builder.createSetup(staleValue, {}, [newPeriodRow]);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [this.builder.storedScoreId]);
            this.assert.deepStrictEqual(setup.repositories.scores.rows, [newPeriodRow]);
            this.assert.deepStrictEqual(
                setup.repositories.config.storedValues,
                [this.resetPendingValue, this.resetPeriodKey]
            );
            let expectedMessages = this.builder.expectedScoresMessages(
                [{playerName: 'player-8', score: 5}],
                ScoresConst.RESET.DEFAULTS.RESET_SCORE
            );
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, expectedMessages.broadcasts);
        });
    }

    async testStalePendingOfAnOlderPeriodUsesTheCurrentIds()
    {
        await this.test('a stale pending reset of an older period resets every current row', async () => {
            let staleValue = this.builder.buildPendingValue(
                this.previousPeriodKey,
                1000,
                this.builder.storedScoreId,
                1
            );
            let setup = this.builder.createSetup(staleValue, {}, [{id: 1, player_id: 7}, {id: 2, player_id: 8}]);
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.deepStrictEqual(checkResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [2]);
            this.assert.deepStrictEqual(setup.repositories.scores.rows, []);
        });
    }

    async testFailedResetKeepsThePendingStateAndIsRetried()
    {
        await this.test('a failed reset keeps its pending state and is retried with the same ids', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            let deleteScores = setup.repositories.scores.delete;
            setup.repositories.scores.delete = async () => {
                throw new TypeError('Scores storage not available.');
            };
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(setup.scoresPeriodReset.isRunning, false);
            this.assert.strictEqual(setup.repositories.config.lastPeriodRow.value, this.resetPendingValue);
            setup.repositories.scores.delete = deleteScores;
            setup.repositories.scores.rows.push({id: 2, player_id: 8, total_score: 5});
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, []);
            let retryDate = new Date(this.resetDate.getTime() + ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS);
            let retryResult = await setup.scoresPeriodReset.check(retryDate);
            this.assert.deepStrictEqual(retryResult, {periodKey: this.resetPeriodKey, resetScores: true});
            this.assert.deepStrictEqual(setup.repositories.scores.deletes, [this.builder.storedScoreId]);
            this.assert.deepStrictEqual(setup.repositories.scores.rows.map(row => row.id), [2]);
            this.assert.strictEqual(setup.repositories.config.lastPeriodRow.value, this.resetPeriodKey);
        });
    }

    async testResetTakenOverBeforeItsEndSendsAfterTheOtherServer()
    {
        await this.test('a reset taken over before its end is sent once the other server ends it', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            let deleteScores = setup.repositories.scores.delete;
            setup.repositories.scores.delete = async (filters) => {
                setup.repositories.config.lastPeriodRow.value = this.builder.buildPendingValue(
                    this.resetPeriodKey,
                    1,
                    1,
                    1
                );
                return await deleteScores(filters);
            };
            this.assert.strictEqual(await setup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, []);
            setup.repositories.config.lastPeriodRow.value = this.resetPeriodKey;
            let checkResult = await setup.scoresPeriodReset.check(this.resetDate);
            this.assert.strictEqual(checkResult.refreshedScores, true);
            this.assert.deepStrictEqual(setup.sceneRoom.broadcasts, this.emptyScoresMessages.broadcasts);
        });
    }

    async testMissingRowOrPeriodResetsNothing()
    {
        await this.test('a missing period key row or an unknown period resets nothing', async () => {
            let missingRowSetup = this.builder.createSetup(false);
            this.assert.strictEqual(await missingRowSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.deepStrictEqual(missingRowSetup.repositories.scores.deletes, []);
            let yearlyPeriod = {[ScoresConst.RESET.CONFIG_PATHS.PERIOD]: 'yearly'};
            let unknownPeriodSetup = this.builder.createSetup(this.previousPeriodKey, yearlyPeriod);
            this.assert.strictEqual(await unknownPeriodSetup.scoresPeriodReset.check(this.resetDate), false);
            this.assert.strictEqual(unknownPeriodSetup.repositories.config.lastPeriodRow.value, this.previousPeriodKey);
        });
    }

    async testStartAndStopTheCheckInterval()
    {
        await this.test('the check interval starts once and its stop clears it', async () => {
            let setup = this.builder.createSetup(this.previousPeriodKey);
            this.assert.strictEqual(setup.scoresPeriodReset.start(), true);
            let firstInterval = setup.scoresPeriodReset.checkInterval;
            this.assert.strictEqual(setup.scoresPeriodReset.start(), true);
            this.assert.notStrictEqual(setup.scoresPeriodReset.checkInterval, firstInterval);
            this.assert.strictEqual(setup.scoresPeriodReset.stop(), true);
            this.assert.strictEqual(setup.scoresPeriodReset.checkInterval, false);
            this.assert.strictEqual(setup.scoresPeriodReset.stop(), false);
        });
    }

}

module.exports.TestScoresPeriodReset = TestScoresPeriodReset;
