/**
 *
 * Reldens - Test Kill Score Panels
 *
 * Tests the scores panel of the clients around a kill (KillScoreRulesSteps, the panel content read with
 * KillScoreSteps even while the panel is closed): a player kill updates the top scores rows of the killed player and of
 * an unrelated third player in the room, while the personal score update reaches only the attacker (the killed player
 * score line stays and it gets no score update message); the player score line shows the total after a new login and
 * after a scene change; an enemy kill with the panel open shows the new total on the score line itself; a second player
 * in the room with the panel closed opens it and sees the updated rows; a player in the town with the panel open keeps
 * its rows while a forest kill happens and gets the new rows on its next join; and with more than 10 scores rows (11
 * players with their scores seeded for the group) the kill broadcast and the panel keep 10 rows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillScoreRulesSteps } = require('./helpers/kill-score-rules-steps');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ScoresConst } = require('../../lib/scores/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScorePanels
{

    static SEEDED_PLAYER_PREFIX = 'ScoresSeed';
    static SEEDED_ROWS = 11;

    static async waitForPanelRow(page, playerName, totalScore, message)
    {
        await expect.poll(
            async () => (await KillScoreSteps.fetchPanelContent(page)).rows,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toContainEqual({playerName, totalScore});
    }

    static async waitForMyScore(page, totalScore, message)
    {
        await expect.poll(
            async () => (await KillScoreSteps.fetchPanelContent(page)).myScore,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(totalScore);
    }

    static async placeEnemy(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        return scoreData;
    }

    static async finishEnemyKill(context, scoreData)
    {
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        return await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
    }

    static async runPlayerKillPanelsTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let observerPage = false;
        let victimScoreBefore = 0;
        let kill = await KillScoreRulesSteps.killVictim(context, scoreData, async () => {
            observerPage = await KillScoreSteps.loginThirdInForest(context);
            await RoomMessagesRecorder.start(context.secondPage);
            victimScoreBefore = (await KillScoreSteps.fetchPanelContent(context.secondPage)).myScore;
        });
        let attackerTotal = KillScoreRulesSteps.totalScore(kill.rowAfter);
        for(let panelPage of [context.secondPage, observerPage]){
            await TestKillScorePanels.waitForPanelRow(
                panelPage,
                context.gameConfig.e2ePlayerName,
                attackerTotal,
                'The killed player and the unrelated player get the attacker new total in the rows'
            );
        }
        await TestKillScorePanels.waitForMyScore(context.page, attackerTotal, 'The attacker score line shows its new total');
        expect(
            (await KillScoreSteps.fetchPanelContent(context.secondPage)).myScore,
            'The killed player score line does not change'
        ).toBe(victimScoreBefore);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.secondPage, ScoresConst.ACTIONS.UPDATE),
            'The personal score update reaches only the attacker'
        ).toEqual([]);
    }

    static async runScoreLineAfterJoinsTest(context)
    {
        let scoreData = await TestKillScorePanels.placeEnemy(context);
        let total = await TestKillScorePanels.finishEnemyKill(context, scoreData);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await TestKillScorePanels.waitForMyScore(context.page, total, 'The score line shows the total after a new login');
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        await TestKillScorePanels.waitForMyScore(context.page, total, 'The score line shows the total after a scene change');
    }

    static async runOpenPanelKillTest(context)
    {
        let scoreData = await TestKillScorePanels.placeEnemy(context);
        await KillScoreSteps.openScoresPanel(context.page, context.longRun);
        let total = await TestKillScorePanels.finishEnemyKill(context, scoreData);
        await expect(
            context.page.locator(Selectors.scores.myScore),
            'The visible score line shows the new total'
        ).toHaveText(new RegExp(':\\s*'+total+'\\s*$'));
    }

    static async runClosedPanelTest(context)
    {
        let scoreData = await TestKillScorePanels.placeEnemy(context);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        await expect(context.secondPage.locator(Selectors.scores.dialog), 'The second player panel is closed').toBeHidden();
        let total = await TestKillScorePanels.finishEnemyKill(context, scoreData);
        await KillScoreSteps.openScoresPanel(context.secondPage, context.longRun);
        await TestKillScorePanels.waitForPanelRow(
            context.secondPage,
            context.gameConfig.e2ePlayerName,
            total,
            'The opened panel shows the updated rows'
        );
    }

    static async runOtherRoomPanelTest(context)
    {
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await KillScoreSteps.openScoresPanel(context.secondPage, context.longRun);
        let rowsBefore = (await KillScoreSteps.fetchPanelContent(context.secondPage)).rows;
        let scoreData = await TestKillScorePanels.placeEnemy(context);
        let total = await TestKillScorePanels.finishEnemyKill(context, scoreData);
        expect(
            (await KillScoreSteps.fetchPanelContent(context.secondPage)).rows,
            'The panel of the player in the town does not change with the forest kill'
        ).toEqual(rowsBefore);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        await TestKillScorePanels.waitForPanelRow(
            context.secondPage,
            context.gameConfig.e2ePlayerName,
            total,
            'The next join gets the new rows'
        );
    }

    static async runTopRowsLimitTest(context)
    {
        let userId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'users', {
            username: context.gameConfig.e2eUsername
        });
        for(let rowIndex = 1; rowIndex <= TestKillScorePanels.SEEDED_ROWS; rowIndex++){
            let seededPlayer = await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'players', {
                user_id: userId,
                name: TestKillScorePanels.SEEDED_PLAYER_PREFIX+rowIndex
            });
            await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'scores', {
                player_id: seededPlayer.id,
                total_score: rowIndex,
                players_kills_count: 0,
                npcs_kills_count: 0
            });
        }
        let scoreData = await TestKillScorePanels.placeEnemy(context);
        await RoomMessagesRecorder.start(context.page);
        await TestKillScorePanels.finishEnemyKill(context, scoreData);
        let topScores = await RoomMessagesRecorder.fetchMessages(context.page, ScoresConst.ACTIONS.TOP_SCORES_UPDATE);
        expect(topScores.length, 'The kill broadcasts the top scores').toBeGreaterThan(0);
        expect(topScores.pop().scores, 'The broadcast keeps 10 rows').toHaveLength(ScoresConst.TOP_SCORES_PAGE_SIZE);
        expect(
            (await KillScoreSteps.fetchPanelContent(context.page)).rows,
            'The panel keeps 10 rows'
        ).toHaveLength(ScoresConst.TOP_SCORES_PAGE_SIZE);
    }

    static run()
    {
        test.describe('Kill Score Panels', () => {
            test('player kill updates the rows of the killed and of an unrelated player and the score line only of the attacker', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScorePanels.runPlayerKillPanelsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('score line shows the total after a new login and after a scene change', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScorePanels.runScoreLineAfterJoinsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy kill with the panel open shows the new total on the score line', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScorePanels.runOpenPanelKillTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player with the panel closed opens it and sees the updated rows', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScorePanels.runClosedPanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player in another room keeps its panel rows until its next join', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScorePanels.runOtherRoomPanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('more than 10 scores rows keep 10 rows on the kill broadcast and the panel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScorePanels.runTopRowsLimitTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestKillScorePanels.run();
