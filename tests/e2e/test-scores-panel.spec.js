/**
 *
 * Reldens - Test Scores Panel
 *
 * Tests the scores panel of the group players (KillScoreSteps opens and reads the panel, the scores rows of the group
 * players preserved and the seeded rows created for the group over the highest stored score, so they are always in the
 * top scores and the reset deletes them): the own score line shows 0 with no stored row and with a row of total 0, and
 * the stored total after a new login; the configured panel title and own score label are used, the label with the score
 * in it; the close button hides the panel and the open button shows the same data again; a player joining the room
 * re-renders the rows of an open panel from its join broadcast while the own score line of the open panel stays its
 * own, and a join in another room leaves that panel unchanged; a player named with HTML (seeded straight in the
 * database for another user) is listed in the panel with its name as text and no script runs; and a scene change
 * closes the open panel, reopened with
 * the new room data, or keeps it open with the dialogs close disabled, with one scores panel in both cases.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { TeamSteps } = require('./helpers/team-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const ScoresSnippets = require('../../lib/scores/client/snippets/en_US');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestScoresPanel
{

    static LABELS_PATH = 'client/scores/labels/';
    static CONFIGURED_TITLE = 'E2E scores title';
    static CONFIGURED_MY_SCORE = 'E2E points: %myScore';
    static CLOSE_DIALOGS_PATH = 'client/rooms/automaticallyCloseAllDialogsOnSceneChange';
    static SCORES_GAP = 1000;

    static async preparePlayers(context, suffixes)
    {
        let storedScores = await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'scores', {});
        let players = [];
        for(let suffix of suffixes){
            let playerName = context.gameConfig['e2ePlayerName'+suffix];
            let prepared = await KillScoreSteps.prepareKillScore(context.gameConfig, context.e2eGroup, context.longRun, playerName);
            players.push({suffix, playerName, playerId: prepared.playerId});
        }
        players.scoresBase = Math.max(0, ...storedScores.map(score => Number(score.total_score))) + TestScoresPanel.SCORES_GAP;
        return players;
    }

    static async seedScore(context, player, totalScore)
    {
        return await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'scores', {
            player_id: player.playerId,
            total_score: totalScore,
            players_kills_count: 0,
            npcs_kills_count: 0
        });
    }

    static async loginAndOpen(context, page, player)
    {
        await Login.loginRootPlayer(page, context.gameConfig, context.longRun, player.suffix);
        await KillScoreSteps.openScoresPanel(page, context.longRun);
    }

    static async expectMyScore(page, score, message, label = ScoresSnippets.scores.myScore)
    {
        await expect(page.locator(Selectors.scores.myScore), message).toHaveText(label.replace('%myScore', score), {
            timeout: TimeConstants.SERVER_RESPONSE
        });
    }

    static async expectRow(page, playerName, totalScore, message)
    {
        await expect.poll(async () => (await KillScoreSteps.fetchPanelContent(page)).rows.filter(
            row => row.playerName === playerName
        ).map(row => row.totalScore), {message, timeout: TimeConstants.SERVER_RESPONSE}).toEqual([totalScore]);
    }

    static async runOwnScoreLineTest(context)
    {
        let page = context.page;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        let players = await TestScoresPanel.preparePlayers(context, ['']);
        let player = players[0];
        expect(await KillScoreSteps.fetchScoreRows(context.gameConfig, player.playerId), 'No stored score row').toEqual([]);
        await TestScoresPanel.loginAndOpen(context, page, player);
        await TestScoresPanel.expectMyScore(page, 0, 'No stored row shows 0');
        let seededRow = await TestScoresPanel.seedScore(context, player, 0);
        await page.reload();
        await TestScoresPanel.loginAndOpen(context, page, player);
        await TestScoresPanel.expectMyScore(page, 0, 'A stored total of 0 shows 0');
        let storedTotal = players.scoresBase;
        await E2eSeedAndRestoreApi.updateCreatedRow(context.gameConfig, context.e2eGroup, 'scores', seededRow.id, {total_score: storedTotal});
        await page.reload();
        await TestScoresPanel.loginAndOpen(context, page, player);
        await TestScoresPanel.expectMyScore(page, storedTotal, 'The stored total after a new login');
        await TestScoresPanel.expectRow(page, player.playerName, storedTotal, 'The own row is listed');
    }

    static async runConfiguredLabelsTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        let labelsPath = TestScoresPanel.LABELS_PATH;
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, context.e2eGroup, labelsPath+'title', TestScoresPanel.CONFIGURED_TITLE);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, context.e2eGroup, labelsPath+'myScore', TestScoresPanel.CONFIGURED_MY_SCORE);
        let [player] = await TestScoresPanel.preparePlayers(context, ['']);
        await TestScoresPanel.loginAndOpen(context, context.page, player);
        await expect(context.page.locator(Selectors.scores.dialogTitle), 'The configured title').toHaveText(
            TestScoresPanel.CONFIGURED_TITLE
        );
        await TestScoresPanel.expectMyScore(context.page, 0, 'The configured label with the score', TestScoresPanel.CONFIGURED_MY_SCORE);
    }

    static async runCloseAndReopenTest(context)
    {
        let page = context.page;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        let players = await TestScoresPanel.preparePlayers(context, ['']);
        await TestScoresPanel.seedScore(context, players[0], players.scoresBase);
        await TestScoresPanel.loginAndOpen(context, page, players[0]);
        await TestScoresPanel.expectRow(page, players[0].playerName, players.scoresBase, 'The panel lists the own row');
        let contentBefore = await page.locator(Selectors.scores.dialogContent).innerHTML();
        await page.locator(Selectors.scores.dialog+' .box-close').click();
        await expect(page.locator(Selectors.scores.dialog), 'The close button hides the panel').toBeHidden();
        await expect(page.locator(Selectors.hud.scoresOpen), 'The open button shows again').toBeVisible();
        await KillScoreSteps.openScoresPanel(page, context.longRun);
        expect(await page.locator(Selectors.scores.dialogContent).innerHTML(), 'The same data again').toBe(contentBefore);
    }

    static async runJoinBroadcastTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 5, context.longRun));
        let players = await TestScoresPanel.preparePlayers(context, ['', '2', '3']);
        let [owner, joining, scored] = players;
        let ownScore = players.scoresBase;
        await TestScoresPanel.seedScore(context, owner, ownScore);
        await TestScoresPanel.loginAndOpen(context, context.page, owner);
        await TestScoresPanel.expectMyScore(context.page, ownScore, 'The owner own score');
        let scoredRow = await TestScoresPanel.seedScore(context, scored, ownScore + 1);
        await TestScoresPanel.loginAndOpen(context, context.secondPage, joining);
        await TestScoresPanel.expectRow(context.page, scored.playerName, ownScore + 1, 'The join broadcast re-renders the panel');
        await TestScoresPanel.expectMyScore(context.page, ownScore, 'The own score line stays the owner one');
        await TestScoresPanel.expectMyScore(context.secondPage, 0, 'The joining player gets its own score');
        await E2eSeedAndRestoreApi.updateCreatedRow(context.gameConfig, context.e2eGroup, 'scores', scoredRow.id, {total_score: ownScore + 2});
        await TeamSteps.changeScene(context, {page: context.secondPage, playerName: joining.playerName}, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await KillScoreSteps.openScoresPanel(context.secondPage, context.longRun);
        await TestScoresPanel.expectRow(context.secondPage, scored.playerName, ownScore + 2, 'The forest join sends the new rows');
        await TestScoresPanel.expectRow(context.page, scored.playerName, ownScore + 1, 'The town panel does not change');
    }

    static async runHtmlNameTest(context)
    {
        let gameConfig = context.gameConfig;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        let players = await TestScoresPanel.preparePlayers(context, ['']);
        let htmlName = await KillScoreSteps.createHtmlNamedPlayer(gameConfig, context.e2eGroup, gameConfig.e2eUsername3);
        let htmlNamedPlayerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: htmlName});
        await TestScoresPanel.seedScore(context, {playerId: htmlNamedPlayerId}, players.scoresBase);
        await TestScoresPanel.loginAndOpen(context, context.page, players[0]);
        let firstRowName = context.page.locator(Selectors.scores.dialogRows).first().locator(Selectors.scores.rowPlayerName);
        await KillScoreSteps.expectNameAsText(firstRowName, htmlName);
    }

    static async runSceneChangeTest(context, isClosingDialogs)
    {
        let page = context.page;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 3, context.longRun));
        if(!isClosingDialogs){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, TestScoresPanel.CLOSE_DIALOGS_PATH, false);
        }
        let players = await TestScoresPanel.preparePlayers(context, ['', '3']);
        let scoredRow = await TestScoresPanel.seedScore(context, players[1], players.scoresBase);
        await TestScoresPanel.loginAndOpen(context, page, players[0]);
        await TestScoresPanel.expectRow(page, players[1].playerName, players.scoresBase, 'The panel lists the seeded row');
        let newTotal = players.scoresBase + 1;
        await E2eSeedAndRestoreApi.updateCreatedRow(context.gameConfig, context.e2eGroup, 'scores', scoredRow.id, {total_score: newTotal});
        await TeamSteps.changeScene(context, {page, playerName: players[0].playerName}, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        await expect(page.locator(Selectors.scores.dialog), 'The panel after the scene change')
            .toBeVisible({visible: !isClosingDialogs, timeout: TimeConstants.SERVER_RESPONSE});
        await KillScoreSteps.openScoresPanel(page, context.longRun);
        await TestScoresPanel.expectRow(page, players[1].playerName, newTotal, 'The panel shows the new room data');
        await expect(page.locator(Selectors.scores.dialog), 'One scores panel').toHaveCount(1);
    }

    static run()
    {
        test.describe('Scores Panel', () => {
            test('own score line with no row, a zero row and the stored total after a login', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runOwnScoreLineTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('configured title and own score label are used', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runConfiguredLabelsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('close button hides the panel and the open button shows the same data', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runCloseAndReopenTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('join broadcast re-renders the open panel of the room only and keeps the own score', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runJoinBroadcastTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player named with HTML is listed in the panel of another player as text and no script runs', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runHtmlNameTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('scene change closes the open panel and reopened it shows the new room data', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, true);
            });
            test('scene change with the dialogs close disabled keeps the panel open with the new room data', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestScoresPanel.runSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun}, false);
            });
        });
    }

}

TestScoresPanel.run();
