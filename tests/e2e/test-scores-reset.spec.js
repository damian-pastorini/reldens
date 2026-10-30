/**
 *
 * Reldens - Test Scores Reset
 *
 * Tests the scores reset per period: with the reset enabled for the group, a seeded score is listed on the scores panel,
 * then the period check runs on the current date after the stored last period key was set to a previous period, so the
 * check claims the new period key, deletes every scores row and the open scores panel receives the empty top scores.
 * The scores rows and the last period key row are preserved and restored by the group reset.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ScoresPeriodKeyBuilder } = require('../../lib/scores/server/scores-period-key-builder');
const { ScoresConst } = require('../../lib/scores/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestScoresReset
{

    static PREVIOUS_PERIOD_DAYS = 40;
    static DAY_MS = 86400000;
    static SEEDED_SCORE = 1000;

    static async runScoresResetTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'config', {
            scope: ScoresConst.RESET.LAST_PERIOD_KEY.SCOPE,
            path: ScoresConst.RESET.LAST_PERIOD_KEY.PATH
        });
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, ScoresConst.RESET.CONFIG_PATHS.ENABLED, true);
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'scores', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName2}),
            total_score: TestScoresReset.SEEDED_SCORE,
            players_kills_count: 0,
            npcs_kills_count: 0
        });
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.locator(Selectors.hud.scoresOpen).waitFor({state: 'visible', timeout: uiTimeout});
        await page.click(Selectors.hud.scoresOpen);
        let scoresRows = page.locator(Selectors.scores.dialogRows);
        await expect(scoresRows.first()).toBeVisible({timeout: uiTimeout});
        await LongRunShowcase.pause(page, longRun);
        await screenshots.capture(page, 'scores-before-reset');
        let period = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ScoresConst.RESET.CONFIG_PATHS.PERIOD);
        let currentDate = new Date();
        let previousDate = new Date(currentDate.getTime() - TestScoresReset.PREVIOUS_PERIOD_DAYS * TestScoresReset.DAY_MS);
        let checkResult = await GameplayE2eStateApi.runScoresResetCheck(
            gameConfig,
            currentDate.toISOString(),
            ScoresPeriodKeyBuilder.build(period, previousDate)
        );
        expect(checkResult, 'The new period must reset the scores').toEqual({
            periodKey: ScoresPeriodKeyBuilder.build(period, currentDate),
            resetScores: true
        });
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {}), 'Every score must be deleted').toEqual([]);
        await expect(scoresRows, 'The scores panel must receive the empty top scores').toHaveCount(0, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await LongRunShowcase.pause(page, longRun);
        await screenshots.capture(page, 'scores-after-reset');
    }

    static run()
    {
        test.describe('Scores Reset', () => {
            test('scores reset on a new period deletes the scores and empties the scores panel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresReset.runScoresResetTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestScoresReset.run();
