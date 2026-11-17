/**
 *
 * Reldens - Test Kill Score
 *
 * Tests the points per kill: the forest Tree has its own "killScore" private param and the stored config uses the NPC
 * custom score, so killing a Tree placed next to the player (KillScoreSteps, before the long run recording starts)
 * adds exactly that score to the player scores row; with the enemies kills switch disabled for the group the same kill
 * (detected by the experience it gives) adds no score. A player killed by the test player, placed next to it in the
 * forest with one life point, targeted with a click and attacked, adds the stored player kill score plus the killed
 * player level points. The player scores rows are preserved and the config values are restored by the group reset. The
 * long run targets the victim and then opens the scores panel, which would cover it, before the recording starts and
 * captions the score before and after the kill with the stored values, the caption changes as soon as the panel shows
 * the new score; the killed player gets some life points, so its video shows a few hits, and it is recorded too, with
 * its life in the HUD, and all the other enemies are disabled so none walks around in those videos (the normal run
 * disables only the aggressive ones). The check for a late score keeps its whole wait, the long run walks the
 * player during it, so the video never freezes.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScore
{

    static NPC_KILLS_SWITCH_PATH = 'server/scores/npcKills/enabled';
    static PLAYER_KILL_SCORE_PATH = 'server/scores/obtainedScorePerPlayer';
    static PLAYER_LEVEL_MULTIPLIER_PATH = 'server/scores/obtainedScorePerPlayerLevelMultiplier';
    static VICTIM_VIDEO_SUFFIX = 'player2';

    static prepareTimeOut(longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
        );
    }

    static async runKillScoreTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        TestKillScore.prepareTimeOut(longRun);
        let scoreData = await KillScoreSteps.prepareKillScore(gameConfig, e2eGroup, longRun);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(page, gameConfig, longRun);
        let expectedScore = scoreData.scoreBefore + placement.killScore;
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'Score before the kill: '+scoreData.scoreBefore+' - this enemy kill score: '+placement.killScore
        );
        await screenshots.capture(page, 'enemy-with-kill-score-targeted');
        await KillScoreSteps.attackUntilScore(page, gameConfig, scoreData, expectedScore, longRun);
        await KillScoreSteps.showScore(page, expectedScore, longRun);
        await screenshots.capture(page, 'kill-score-added');
    }

    static async runDisabledNpcKillsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        TestKillScore.prepareTimeOut(longRun);
        let scoreData = await KillScoreSteps.prepareKillScore(gameConfig, e2eGroup, longRun);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, TestKillScore.NPC_KILLS_SWITCH_PATH, 0);
        await KillScoreSteps.placeEnemyWithKillScore(page, gameConfig, longRun);
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'Kills score disabled - score before the kill: '+scoreData.scoreBefore
        );
        let kill = await KillScoreSteps.attackUntilKill(page, gameConfig);
        await LongRunShowcase.showStep(
            page,
            'Killed, experience '+kill.experienceBefore+' to '+kill.experienceAfter
            +': the player walks during the score check',
            longRun
        );
        await KillScoreSteps.waitForLateScore(page, longRun);
        expect(
            await KillScoreSteps.fetchTotalScore(gameConfig, scoreData.playerId),
            'The disabled enemies kills switch must add no score'
        ).toBe(scoreData.scoreBefore);
        await LongRunShowcase.showStep(
            page,
            'No score added: '+scoreData.scoreBefore+' before and after the kill',
            longRun
        );
        await KillScoreSteps.showScore(page, scoreData.scoreBefore, longRun);
        await screenshots.capture(page, 'enemy-kill-without-score');
    }

    static async startBothClientsRecording(page, secondPage, gameConfig, scoreBefore, killScore, longRun)
    {
        await Promise.all([
            LongRunShowcase.startGameplayRecording(
                page,
                longRun,
                'Score before the kill: '+scoreBefore+' - this player kill score: '+killScore
            ),
            LongRunShowcase.startGameplayRecording(
                secondPage,
                longRun,
                gameConfig.e2ePlayerName+' attacks '+gameConfig.e2ePlayerName2+' until it dies',
                LongRunShowcase.CAMERA_ZOOM,
                TestKillScore.VICTIM_VIDEO_SUFFIX
            )
        ]);
    }

    static async runPlayerKillScoreTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        TestKillScore.prepareTimeOut(longRun);
        let scoreData = await KillScoreSteps.prepareKillScore(gameConfig, e2eGroup, longRun);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, forestData.sceneTimeout, longRun);
        let victimLevel = await KillScoreSteps.placeTargetedVictim(page, secondPage, gameConfig, longRun);
        let expectedScore = scoreData.scoreBefore
            + Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestKillScore.PLAYER_KILL_SCORE_PATH))
            + victimLevel * Number(
                await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestKillScore.PLAYER_LEVEL_MULTIPLIER_PATH)
            );
        expect(expectedScore, 'The player kill must be worth points').toBeGreaterThan(scoreData.scoreBefore);
        await TestKillScore.startBothClientsRecording(
            page,
            secondPage,
            gameConfig,
            scoreData.scoreBefore,
            expectedScore - scoreData.scoreBefore,
            longRun
        );
        await screenshots.capture(page, 'player-victim-targeted');
        await KillScoreSteps.attackUntilScore(page, gameConfig, scoreData, expectedScore, longRun);
        await LongRunShowcase.showStep(
            secondPage,
            gameConfig.e2ePlayerName2+' killed: the score of '+gameConfig.e2ePlayerName+' is now '+expectedScore,
            longRun
        );
        await KillScoreSteps.showScore(page, expectedScore, longRun);
        await screenshots.capture(page, 'player-kill-score-added');
    }

    static run()
    {
        test.describe('Kill Score', () => {
            test('killing an enemy with its own kill score adds that score to the player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScore.runKillScoreTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('killing an enemy with the enemies kills score disabled adds no score', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScore.runDisabledNpcKillsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('killing another player adds the player kill score to the attacker', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScore.runPlayerKillScoreTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestKillScore.run();
