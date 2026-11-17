/**
 *
 * Reldens - Test Scores Reset
 *
 * Tests the scores reset per period: with the reset enabled for the group, a seeded score is listed on the scores panel,
 * then the period check runs on the current date after the stored last period key was set to a previous period, so the
 * check claims the new period key, deletes every scores row and the open scores panel receives the empty top scores.
 * The scores rows and the last period key row are preserved and restored by the group reset. The check is a server
 * call with nothing on screen, so the long run opens the panel and stops the town NPCs before the recording starts and
 * captions the panel rows, before and after the reset, and the period change with their real values. The reset also
 * empties the open panels of the players in the same and in another scene room and sets their own scores to 0, a panel
 * closed during the reset opens emptied, and a player away during the reset logs in to the reset scores.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { MovementScenario } = require('./helpers/movement-scenario');
const { ShowcaseSteps } = require('./helpers/showcase-steps');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { ScoresResetSteps } = require('./helpers/scores-reset-steps');
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

    static async fetchPanelRowsStep(scoresRows, stepText)
    {
        return (await scoresRows.allInnerTexts()).reduce(
            (stepValues, rowText) => stepValues+' - '+rowText.replace(/\s+/g, ' ').trim(),
            stepText+': rows '+await scoresRows.count()
        );
    }

    static async seedScore(gameConfig, e2eGroup, playerName)
    {
        return await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'scores', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName}),
            total_score: TestScoresReset.SEEDED_SCORE,
            players_kills_count: 0,
            npcs_kills_count: 0
        });
    }

    static async expectOwnScore(page, expectedScore, message)
    {
        await KillScoreSteps.openScoresPanel(page, false);
        await expect.poll(async () => (await KillScoreSteps.fetchPanelContent(page)).myScore, {
            message,
            timeout: TimeConstants.SERVER_RESPONSE
        }).toBe(expectedScore);
    }

    static async expectResetPanel(page, message)
    {
        await KillScoreSteps.openScoresPanel(page, false);
        await expect.poll(async () => await KillScoreSteps.fetchPanelContent(page), {
            message,
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual({rows: [], myScore: 0});
    }

    static async expectReset(gameConfig)
    {
        let periodKeys = await ScoresResetSteps.resetFromPreviousPeriod(gameConfig, new Date());
        expect(periodKeys.checkResult, 'The new period resets the scores').toEqual({
            periodKey: periodKeys.currentPeriodKey,
            resetScores: true
        });
    }

    static async runPanelsResetTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        await ScoresResetSteps.enableReset(gameConfig, context.e2eGroup);
        await TestScoresReset.seedScore(gameConfig, context.e2eGroup, gameConfig.e2ePlayerName);
        await TestScoresReset.seedScore(gameConfig, context.e2eGroup, gameConfig.e2ePlayerName3);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestScoresReset.expectOwnScore(context.page, TestScoresReset.SEEDED_SCORE, 'The town player own score');
        await Login.loginRootPlayer(context.secondPage, gameConfig, context.longRun, '2');
        await KillScoreSteps.openScoresPanel(context.secondPage, context.longRun);
        await context.secondPage.locator(Selectors.scores.dialog+' .box-close').click();
        await expect(context.secondPage.locator(Selectors.scores.dialog), 'The second panel is closed').toBeHidden();
        let forestPage = (await Login.startThirdPlayer(context, Login.FOREST_ROOM_NAME)).clientPage;
        await TestScoresReset.expectOwnScore(forestPage, TestScoresReset.SEEDED_SCORE, 'The forest player own score');
        await TestScoresReset.expectReset(gameConfig);
        await TestScoresReset.expectResetPanel(context.page, 'The open town panel is emptied and its own score is 0');
        await TestScoresReset.expectResetPanel(forestPage, 'The open forest panel is emptied and its own score is 0');
        await TestScoresReset.expectResetPanel(context.secondPage, 'The panel closed during the reset opens emptied');
    }

    static async runLoginAfterResetTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        await ScoresResetSteps.enableReset(gameConfig, context.e2eGroup);
        await TestScoresReset.seedScore(gameConfig, context.e2eGroup, gameConfig.e2ePlayerName);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestScoresReset.expectOwnScore(context.page, TestScoresReset.SEEDED_SCORE, 'The own score before leaving');
        await context.page.reload();
        await TestScoresReset.expectReset(gameConfig);
        await Login.loginRootPlayer(context.page, gameConfig, context.longRun);
        await TestScoresReset.expectResetPanel(context.page, 'The login after the reset shows the reset data');
    }

    static async runScoresResetTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'config', {
            scope: ScoresConst.RESET.LAST_PERIOD_KEY.SCOPE,
            path: ScoresConst.RESET.LAST_PERIOD_KEY.PATH
        });
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, ScoresConst.RESET.CONFIG_PATHS.ENABLED, true);
        await TestScoresReset.seedScore(gameConfig, e2eGroup, gameConfig.e2ePlayerName2);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.locator(Selectors.hud.scoresOpen).waitFor({state: 'visible', timeout: uiTimeout});
        await page.click(Selectors.hud.scoresOpen);
        let scoresRows = page.locator(Selectors.scores.dialogRows);
        await expect(scoresRows.first()).toBeVisible({timeout: uiTimeout});
        if(longRun){
            await MovementScenario.pauseMovingObjects(gameConfig, Login.TOWN_ROOM_NAME);
        }
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            await TestScoresReset.fetchPanelRowsStep(scoresRows, 'Scores panel before the reset')
        );
        await LongRunShowcase.pause(page, longRun);
        await screenshots.capture(page, 'scores-before-reset');
        let period = await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ScoresConst.RESET.CONFIG_PATHS.PERIOD);
        let currentDate = new Date();
        let previousDate = new Date(currentDate.getTime() - TestScoresReset.PREVIOUS_PERIOD_DAYS * TestScoresReset.DAY_MS);
        let previousPeriodKey = ScoresPeriodKeyBuilder.build(period, previousDate);
        let currentPeriodKey = ScoresPeriodKeyBuilder.build(period, currentDate);
        await ShowcaseSteps.showAndPause(
            page,
            'New '+period+' period: '+previousPeriodKey+' changes to '+currentPeriodKey+', the scores reset now',
            longRun
        );
        let checkResult = await GameplayE2eStateApi.runScoresResetCheck(
            gameConfig,
            currentDate.toISOString(),
            previousPeriodKey
        );
        expect(checkResult, 'The new period must reset the scores').toEqual({
            periodKey: currentPeriodKey,
            resetScores: true
        });
        expect(await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {}), 'Every score must be deleted').toEqual([]);
        await expect(scoresRows, 'The scores panel must receive the empty top scores').toHaveCount(0, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await ShowcaseSteps.showAndPause(
            page,
            await TestScoresReset.fetchPanelRowsStep(scoresRows, 'Scores panel after the reset'),
            longRun
        );
        await screenshots.capture(page, 'scores-after-reset');
    }

    static run()
    {
        test.describe('Scores Reset', () => {
            test('scores reset on a new period deletes the scores and empties the scores panel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresReset.runScoresResetTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('scores reset empties the panels in the same and other rooms, the own scores and a closed panel', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestScoresReset.runPanelsResetTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('player away during the scores reset logs in to the reset scores', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestScoresReset.runLoginAfterResetTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestScoresReset.run();
