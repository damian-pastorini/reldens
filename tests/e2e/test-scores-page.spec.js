/**
 *
 * Reldens - Test Scores Page
 *
 * Tests the full scores page with the stored rows counted at the test start (exclusive group, so no other group adds
 * rows while it runs; the seeded rows and the config overrides are removed by the group reset): with no page size
 * configured a page holds the default page size rows; the last page holds the rows left; the pager shows five numeric
 * links plus the last one on the first page and the first link plus the range around a middle page; a page parameter
 * of zero, negative, not numeric or repeated shows the first page with its rows, pager and current link, and one
 * beyond the last page shows no rows; a page parameter with decimals shows the first page; a page size of zero shows
 * the default page size page with no infinite page link; two rows with the same score are listed once each on the
 * first two pages, in their creation order; the title falls back to the default heading or uses the configured one; a
 * player named with HTML is listed with its name as text and no script runs; and with every score deleted by the
 * period reset the page shows no rows and no pager.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { ScoresResetSteps } = require('./helpers/scores-reset-steps');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { Selectors } = require('./selectors');
const { ScoresConst } = require('../../lib/scores/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestScoresPage
{

    static SCORES_PATH = '/scores';
    static PAGE_LINK_PREFIX = '/scores/?page=';
    static PAGE_SIZE_PATH = 'server/scores/fullTableView/pageSize';
    static TITLE_PATH = 'server/scores/fullTableView/title';
    static DEFAULT_TITLE = 'Scores Table';
    static CONFIGURED_TITLE = 'E2E Scores Table';
    static PAGER_ROWS = 7;
    static TOP_SCORE_GAP = 1000;
    static LAST_PAGE_SEEDED_ROWS = 3;
    static PAGES_SEEDED_ROWS = 3;

    static async seedRows(context, playerName, rowsCount, totalScore)
    {
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: playerName});
        for(let rowIndex = 0; rowIndex < rowsCount; rowIndex++){
            await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'scores', {
                player_id: playerId,
                total_score: totalScore,
                players_kills_count: 0,
                npcs_kills_count: 0
            });
        }
    }

    static async fetchStoredStats(gameConfig)
    {
        let storedStats = {count: 0, topScore: 0};
        for(let score of await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {})){
            storedStats.count++;
            storedStats.topScore = Math.max(storedStats.topScore, Number(score.total_score));
        }
        return storedStats;
    }

    static async openPage(context, pageQuery)
    {
        let response = await context.page.goto(TestScoresPage.SCORES_PATH+pageQuery);
        expect(response.status(), 'The scores page answers '+pageQuery).toBe(200);
        let rowNames = context.page.locator(Selectors.scores.tableRows+' '+Selectors.scores.rowPlayerName);
        let currentPages = context.page.locator(Selectors.scores.currentPage);
        let pageContent = {
            rows: await context.page.locator(Selectors.scores.tableRows).count(),
            names: await rowNames.allTextContents(),
            current: (await currentPages.allTextContents()).map(page => page.trim())
        };
        let pagerLinks = context.page.locator(Selectors.scores.pagerLink);
        pageContent.links = (await pagerLinks.allTextContents()).map(link => link.trim());
        pageContent.hrefs = await pagerLinks.evaluateAll(
            links => links.map(link => link.getAttribute('href'))
        );
        return pageContent;
    }

    static async setPageSize(context, pageSize)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestScoresPage.PAGE_SIZE_PATH,
            pageSize
        );
        return (await TestScoresPage.fetchStoredStats(context.gameConfig)).count;
    }

    static async runDefaultPageSizeTest(context)
    {
        let storedRows = (await TestScoresPage.fetchStoredStats(context.gameConfig)).count;
        await TestScoresPage.seedRows(
            context,
            context.gameConfig.e2ePlayerName,
            Math.max(0, ScoresConst.FULL_TABLE_PAGE_SIZE + 1 - storedRows),
            1
        );
        await E2eSeedAndRestoreApi.removeConfig(context.gameConfig, context.e2eGroup, TestScoresPage.PAGE_SIZE_PATH);
        let firstPage = await TestScoresPage.openPage(context, '');
        expect(firstPage.rows, 'The default page size rows').toBe(ScoresConst.FULL_TABLE_PAGE_SIZE);
        expect(firstPage.links, 'A second page').toContain('2');
    }

    static async runLastPageTest(context)
    {
        let pageSize = 2;
        let storedRows = await TestScoresPage.setPageSize(context, pageSize);
        let seededRows = TestScoresPage.LAST_PAGE_SEEDED_ROWS + storedRows % pageSize;
        await TestScoresPage.seedRows(context, context.gameConfig.e2ePlayerName, seededRows, 1);
        let totalPages = Math.ceil((storedRows + seededRows) / pageSize);
        let lastPage = await TestScoresPage.openPage(context, '?page='+totalPages);
        expect(lastPage.rows, 'The last page holds the one row left').toBe(1);
        expect(lastPage.current, 'The last page is the current one').toEqual([String(totalPages)]);
    }

    static async runPagerLinksTest(context)
    {
        await TestScoresPage.seedRows(context, context.gameConfig.e2ePlayerName, TestScoresPage.PAGER_ROWS, 1);
        let totalPages = await TestScoresPage.setPageSize(context, 1);
        let firstPage = await TestScoresPage.openPage(context, '?page=1');
        expect(firstPage.links, 'Five numeric links plus the last link').toEqual(['1', '2', '3', '4', '5', 'last']);
        let lastLink = [...firstPage.hrefs].pop();
        expect(lastLink, 'The last link opens the last page').toBe(TestScoresPage.PAGE_LINK_PREFIX+totalPages);
        let fifthPage = await TestScoresPage.openPage(context, '?page=5');
        expect(fifthPage.links.slice(0, 6), 'The first link and the range around the page').toEqual([
            'first',
            '3',
            '4',
            '5',
            '6',
            '7'
        ]);
        let firstLink = [...fifthPage.hrefs].shift();
        expect(firstLink, 'The first link opens the page 1').toBe(TestScoresPage.PAGE_LINK_PREFIX+'1');
        expect(fifthPage.current, 'The requested page is the current one').toEqual(['5']);
    }

    static async runInvalidPagesTest(context)
    {
        await TestScoresPage.seedRows(context, context.gameConfig.e2ePlayerName, TestScoresPage.PAGES_SEEDED_ROWS, 1);
        let storedRows = await TestScoresPage.setPageSize(context, 1);
        let firstPage = await TestScoresPage.openPage(context, '');
        expect(firstPage.current, 'The first page is the current one').toEqual(['1']);
        for(let pageQuery of ['?page=0', '?page=-1', '?page=abc', '?page=1&page=2']){
            expect(await TestScoresPage.openPage(context, pageQuery), 'The first page for '+pageQuery).toEqual(firstPage);
        }
        expect((await TestScoresPage.openPage(context, '?page='+(storedRows + 1))).rows, 'No rows beyond the last page')
            .toBe(0);
    }

    static async runDecimalPageTest(context)
    {
        await TestScoresPage.seedRows(context, context.gameConfig.e2ePlayerName, TestScoresPage.PAGES_SEEDED_ROWS, 1);
        await TestScoresPage.setPageSize(context, 2);
        let firstPage = await TestScoresPage.openPage(context, '');
        expect(await TestScoresPage.openPage(context, '?page=1.5'), 'The first page for a decimal page').toEqual(firstPage);
    }

    static async runPageSizeZeroTest(context)
    {
        await TestScoresPage.seedRows(context, context.gameConfig.e2ePlayerName, TestScoresPage.PAGES_SEEDED_ROWS, 1);
        await E2eSeedAndRestoreApi.removeConfig(context.gameConfig, context.e2eGroup, TestScoresPage.PAGE_SIZE_PATH);
        let defaultPageSizePage = await TestScoresPage.openPage(context, '');
        await TestScoresPage.setPageSize(context, 0);
        let zeroPageSizePage = await TestScoresPage.openPage(context, '');
        expect(zeroPageSizePage, 'The default page size page').toEqual(defaultPageSizePage);
        expect(zeroPageSizePage.hrefs.filter(href => href.includes('Infinity')), 'No infinite page link').toEqual([]);
    }

    static async runSameScoresTest(context)
    {
        let storedStats = await TestScoresPage.fetchStoredStats(context.gameConfig);
        let topScore = storedStats.topScore + TestScoresPage.TOP_SCORE_GAP;
        let tiedNames = [context.gameConfig.e2ePlayerName2, context.gameConfig.e2ePlayerName3];
        for(let playerName of tiedNames){
            await TestScoresPage.seedRows(context, playerName, 1, topScore);
        }
        await TestScoresPage.setPageSize(context, 1);
        let listedNames = [];
        for(let page of [1, 2]){
            listedNames.push(...(await TestScoresPage.openPage(context, '?page='+page)).names.map(name => name.trim()));
        }
        expect(listedNames, 'Each tied player once on the first two pages, in creation order').toEqual(tiedNames);
    }

    static async runTitleTest(context)
    {
        await E2eSeedAndRestoreApi.removeConfig(context.gameConfig, context.e2eGroup, TestScoresPage.TITLE_PATH);
        await TestScoresPage.openPage(context, '');
        await expect(context.page.locator(Selectors.scores.pageTitle), 'The default title').toHaveText(
            TestScoresPage.DEFAULT_TITLE
        );
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            TestScoresPage.TITLE_PATH,
            TestScoresPage.CONFIGURED_TITLE
        );
        await TestScoresPage.openPage(context, '');
        await expect(context.page.locator(Selectors.scores.pageTitle), 'The configured title').toHaveText(
            TestScoresPage.CONFIGURED_TITLE
        );
    }

    static async runHtmlNameTest(context)
    {
        let gameConfig = context.gameConfig;
        let htmlName = await KillScoreSteps.createHtmlNamedPlayer(gameConfig, context.e2eGroup, gameConfig.e2eUsername);
        let topScore = (await TestScoresPage.fetchStoredStats(gameConfig)).topScore + TestScoresPage.TOP_SCORE_GAP;
        await TestScoresPage.seedRows(context, htmlName, 1, topScore);
        await TestScoresPage.openPage(context, '');
        let firstRow = context.page.locator(Selectors.scores.tableRows).first();
        await expect(firstRow.locator(Selectors.scores.rowValue), 'The score of the player named with HTML is first')
            .toHaveText(String(topScore));
        await KillScoreSteps.expectNameAsText(firstRow.locator(Selectors.scores.rowPlayerName), htmlName);
    }

    static async runNoScoresTest(context)
    {
        await ScoresResetSteps.enableReset(context.gameConfig, context.e2eGroup);
        let periodKeys = await ScoresResetSteps.resetFromPreviousPeriod(context.gameConfig, new Date());
        expect(periodKeys.checkResult, 'The reset deletes every score').toEqual({
            periodKey: periodKeys.currentPeriodKey,
            resetScores: true
        });
        let emptyPage = await TestScoresPage.openPage(context, '');
        expect([emptyPage.rows, emptyPage.links], 'No rows and no pager').toEqual([0, []]);
    }

    static run()
    {
        test.describe('Scores Page', () => {
            test('no page size configured shows the default page size rows', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runDefaultPageSizeTest({page, gameConfig, e2eGroup});
            });
            test('last page holds the rows left', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runLastPageTest({page, gameConfig, e2eGroup});
            });
            test('pager shows the numeric, first and last links of the requested page', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runPagerLinksTest({page, gameConfig, e2eGroup});
            });
            test('invalid page parameters show the first page and beyond the last page no rows', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runInvalidPagesTest({page, gameConfig, e2eGroup});
            });
            test('page parameter with decimals shows the first page', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runDecimalPageTest({page, gameConfig, e2eGroup});
            });
            test('page size zero shows the default page size page with no infinite link', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runPageSizeZeroTest({page, gameConfig, e2eGroup});
            });
            test('two rows with the same score are listed once each on the first two pages', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runSameScoresTest({page, gameConfig, e2eGroup});
            });
            test('title falls back to the default heading and uses the configured one', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runTitleTest({page, gameConfig, e2eGroup});
            });
            test('player named with HTML is listed with its name as text and no script runs', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runHtmlNameTest({page, gameConfig, e2eGroup});
            });
            test('no scores stored shows no rows and no pager', async ({ page, gameConfig, e2eGroup }) => {
                await TestScoresPage.runNoScoresTest({page, gameConfig, e2eGroup});
            });
        });
    }

}

TestScoresPage.run();
