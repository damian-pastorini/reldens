/**
 *
 * Reldens - Test Kill Score Failures
 *
 * Tests the kill score updates that never reach a normal save (KillScoreRulesSteps, the kill score subscriber methods
 * delayed or failed for the group by KillScoreSubscriberOverrides): the kill score subscriber run with the attacker as
 * the victim gives no score and logs nothing, and run without the target ids (a player death and a battle end) logs the
 * missing target and gives no score; the attacker that leaves the room while its kill score save is delayed still gets
 * its row saved; the score row changed by another writer
 * between the read and the save is read again and the final total includes both changes; the row that keeps changing on
 * every save attempt is never saved and no score update reaches the client; and a storage error on a kill gives no
 * score while the next kill of that player is scored.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillScoreRulesSteps } = require('./helpers/kill-score-rules-steps');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { ScoresConst } = require('../../lib/scores/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScoreFailures
{

    static UPDATER_KEY = 'scoresUpdater';
    static SAVE_DELAY_MS = 3000;
    static SEEDED_TOTAL = 10;
    static OTHER_WRITER_SCORE = 100;
    static MISSING_TARGET_ERROR = 'Missing target ID for score counts.';

    static async seedScoreRow(context, scoreData)
    {
        expect(
            await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId),
            'The player must start without a score row'
        ).toBe(false);
        return await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'scores', {
            player_id: scoreData.playerId,
            total_score: TestKillScoreFailures.SEEDED_TOTAL,
            players_kills_count: 0,
            npcs_kills_count: 0
        });
    }

    static async runKillEventTest(context, killTypes, withTarget, expectLoggedErrors)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreRulesSteps.placeVictim(context);
        let rowBefore = await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId);
        for(let killType of killTypes){
            let killEvent = await KillScoreSteps.runKillEvent(context.gameConfig, {
                attackerName: context.gameConfig.e2ePlayerName,
                killType,
                withTarget
            });
            expect(killEvent.result, 'The '+killType+' kill event is not scored: '+killEvent.error).toBe(false);
            expectLoggedErrors(killEvent.loggedErrors);
        }
        expect(await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId), 'No score changes')
            .toEqual(rowBefore);
    }

    static async runAttackerLeftTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await KillScoreSteps.overrideSubscriberMethod(context, TestKillScoreFailures.UPDATER_KEY, 'updatePlayerScores', {
            delayMs: TestKillScoreFailures.SAVE_DELAY_MS
        });
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await context.page.goto('about:blank');
        await expect.poll(
            async () => await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            {
                message: 'The delayed kill score row is saved after the attacker left',
                timeout: TestKillScoreFailures.SAVE_DELAY_MS + TimeConstants.SERVER_RESPONSE
            }
        ).toBe(totalBefore + placement.killScore);
    }

    static async runRowChangedTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        let seededRow = await TestKillScoreFailures.seedScoreRow(context, scoreData);
        await KillScoreSteps.overrideSubscriberMethod(context, TestKillScoreFailures.UPDATER_KEY, 'saveScore', {
            delayMs: TestKillScoreFailures.SAVE_DELAY_MS
        });
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await expect.poll(
            async () => (await KillScoreSteps.fetchMethodCalls(context, TestKillScoreFailures.UPDATER_KEY, 'saveScore')).called,
            {message: 'The kill score save starts after the row read', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        await E2eSeedAndRestoreApi.updateCreatedRow(context.gameConfig, context.e2eGroup, 'scores', seededRow.id, {
            total_score: TestKillScoreFailures.SEEDED_TOTAL + TestKillScoreFailures.OTHER_WRITER_SCORE
        });
        await expect.poll(
            async () => await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            {
                message: 'The retried save includes the other writer change and the kill score',
                timeout: 2 * TestKillScoreFailures.SAVE_DELAY_MS + TimeConstants.SERVER_RESPONSE
            }
        ).toBe(TestKillScoreFailures.SEEDED_TOTAL + TestKillScoreFailures.OTHER_WRITER_SCORE + placement.killScore);
        expect(
            (await KillScoreSteps.fetchMethodCalls(context, TestKillScoreFailures.UPDATER_KEY, 'saveScore')).called,
            'The changed row makes the first save fail and the update is retried'
        ).toBe(2);
    }

    static async runRowAlwaysChangedTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await TestKillScoreFailures.seedScoreRow(context, scoreData);
        await KillScoreSteps.overrideSubscriberMethod(context, TestKillScoreFailures.UPDATER_KEY, 'saveScore', {
            failuresCount: ScoresConst.SCORE_UPDATE_ATTEMPTS
        });
        await RoomMessagesRecorder.start(context.page);
        let rowBefore = await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            (await KillScoreSteps.fetchMethodCalls(context, TestKillScoreFailures.UPDATER_KEY, 'saveScore')).done,
            'Every save attempt finds the row changed'
        ).toBe(ScoresConst.SCORE_UPDATE_ATTEMPTS);
        expect(await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId), 'The row is never saved')
            .toEqual(rowBefore);
        expect(
            [
                ...await RoomMessagesRecorder.fetchMessages(context.page, ScoresConst.ACTIONS.UPDATE),
                ...await RoomMessagesRecorder.fetchMessages(context.page, ScoresConst.ACTIONS.TOP_SCORES_UPDATE)
            ],
            'No score update reaches the client'
        ).toEqual([]);
    }

    static async runStorageErrorTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await KillScoreSteps.overrideSubscriberMethod(context, TestKillScoreFailures.UPDATER_KEY, 'updatePlayerScores', {
            failuresCount: 1,
            rejects: true
        });
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            (await KillScoreSteps.fetchMethodCalls(context, TestKillScoreFailures.UPDATER_KEY, 'updatePlayerScores')).done,
            'The storage error happened on the first kill'
        ).toBe(1);
        expect(await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId), 'The failed kill gives no score')
            .toBe(totalBefore);
        await KillScoreSteps.placeNextEnemy(context.page, context.gameConfig, context.longRun);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId), 'The next kill of the player is scored')
            .toBe(totalBefore + placement.killScore);
    }

    static run()
    {
        test.describe('Kill Score Failures', () => {
            test('kill score with the attacker as the victim gives no score and logs nothing', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreFailures.runKillEventTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    [GameConst.TYPE_PLAYER],
                    true,
                    (loggedErrors) => expect(loggedErrors, 'The attacker killing itself logs no error').toEqual([])
                );
            });
            test('kill score without the target ids logs the missing target and gives no score', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreFailures.runKillEventTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    [GameConst.TYPE_PLAYER, ObjectsConst.TYPE_OBJECT],
                    false,
                    (loggedErrors) => expect(loggedErrors.join(' '), 'The missing target is logged').toContain(
                        TestKillScoreFailures.MISSING_TARGET_ERROR
                    )
                );
            });
            test('attacker that leaves before its kill score is saved still gets its row saved', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreFailures.runAttackerLeftTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('score row changed by another writer before the save is read again and keeps both changes', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreFailures.runRowChangedTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('score row changed on every save attempt is never saved and sends no update', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreFailures.runRowAlwaysChangedTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('storage error on a kill gives no score and the next kill is scored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreFailures.runStorageErrorTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestKillScoreFailures.run();
