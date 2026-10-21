/**
 *
 * Reldens - Test Scores
 *
 * Tests the scores order (highest first) on the scores panel and on the scores page, and the scores page pagination
 * links. Every case seeds two scores over the highest stored one, so both are the top scores whatever the other groups
 * stored.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestScores
{

    static SCORES_PATH = '/scores';
    static SEEDED_SCORES_GAP = 1000;

    static async seedHighestScores(gameConfig, e2eGroup)
    {
        let storedScores = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {});
        let maxStoredScore = Math.max(0, ...storedScores.map(score => Number(score.total_score)));
        let seededScores = [
            {playerName: gameConfig.e2ePlayerName2, totalScore: maxStoredScore + 2 * TestScores.SEEDED_SCORES_GAP},
            {playerName: gameConfig.e2ePlayerName3, totalScore: maxStoredScore + TestScores.SEEDED_SCORES_GAP}
        ];
        for(let seededScore of seededScores){
            await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'scores', {
                player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: seededScore.playerName}),
                total_score: seededScore.totalScore,
                players_kills_count: 0,
                npcs_kills_count: 0
            });
        }
        return seededScores;
    }

    static async readScoresRows(rowsLocator)
    {
        let rows = [];
        for(let row of await rowsLocator.all()){
            rows.push({
                playerName: (await row.locator(Selectors.scores.rowPlayerName).textContent()).trim(),
                totalScore: Number(await row.locator(Selectors.scores.rowValue).textContent())
            });
        }
        return rows;
    }

    static expectHighestFirst(rows, seededScores)
    {
        let totalScores = rows.map(row => row.totalScore);
        expect(totalScores, 'The scores must be sorted from the highest').toEqual(
            [...totalScores].sort((scoreA, scoreB) => scoreB - scoreA)
        );
        expect(rows.slice(0, seededScores.length), 'The seeded scores must be the top scores').toEqual(seededScores);
    }

    static async runScoresPanelTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let seededScores = await TestScores.seedHighestScores(gameConfig, e2eGroup);
        await Login.loginRootPlayer(page, gameConfig, longRun);
        let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
        await page.locator(Selectors.hud.scoresOpen).waitFor({state: 'visible', timeout: uiTimeout});
        await page.click(Selectors.hud.scoresOpen);
        await expect(page.locator(Selectors.scores.dialog)).toBeVisible({timeout: uiTimeout});
        let rowsLocator = page.locator(Selectors.scores.dialogRows);
        await expect(rowsLocator.nth(seededScores.length - 1)).toBeVisible({timeout: uiTimeout});
        await screenshots.capture(page, 'scores-panel-highest-first');
        TestScores.expectHighestFirst(await TestScores.readScoresRows(rowsLocator), seededScores);
    }

    static async runScoresPageTest(page, screenshots, gameConfig, e2eGroup)
    {
        let seededScores = await TestScores.seedHighestScores(gameConfig, e2eGroup);
        await page.goto(TestScores.SCORES_PATH);
        let rowsLocator = page.locator(Selectors.scores.tableRows);
        await expect(rowsLocator.nth(seededScores.length - 1)).toBeVisible();
        await screenshots.capture(page, 'scores-page-highest-first');
        TestScores.expectHighestFirst(await TestScores.readScoresRows(rowsLocator), seededScores);
    }

    static async runScoresPaginationTest(page, screenshots, gameConfig, e2eGroup)
    {
        let seededScores = await TestScores.seedHighestScores(gameConfig, e2eGroup);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/scores/fullTableView/pageSize', 1);
        await page.goto(TestScores.SCORES_PATH);
        let rowsLocator = page.locator(Selectors.scores.tableRows);
        await expect(page.locator(Selectors.scores.currentPage)).toHaveText('1');
        expect(await TestScores.readScoresRows(rowsLocator), 'The first page shows the highest score').toEqual(
            seededScores.slice(0, 1)
        );
        await screenshots.capture(page, 'scores-page-first-page');
        await page.locator(Selectors.scores.pagerLink, {hasText: /^2$/}).click();
        await expect(page.locator(Selectors.scores.currentPage)).toHaveText('2');
        expect(await TestScores.readScoresRows(rowsLocator), 'The second page shows the second score').toEqual(
            seededScores.slice(1, 2)
        );
        await screenshots.capture(page, 'scores-page-second-page');
    }

    static run()
    {
        test.describe('Scores', () => {
            test('scores panel lists the highest score first', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScores.runScoresPanelTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('scores page lists the highest score first', async ({ page, screenshots, gameConfig, e2eGroup }) => {
                await TestScores.runScoresPageTest(page, screenshots, gameConfig, e2eGroup);
            });
            test('scores page links open the requested page', async ({ page, screenshots, gameConfig, e2eGroup }) => {
                await TestScores.runScoresPaginationTest(page, screenshots, gameConfig, e2eGroup);
            });
        });
    }

}

TestScores.run();
