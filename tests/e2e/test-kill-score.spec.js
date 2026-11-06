/**
 *
 * Reldens - Test Kill Score
 *
 * Tests the points per kill: the forest Tree has its own "killScore" private param and the stored config uses the NPC
 * custom score, so killing a Tree placed next to the player (ForestEnemyKill, before the long run recording starts)
 * adds exactly that score to the player scores row; with the enemies kills switch disabled for the group the same kill
 * (detected by the experience it gives) adds no score. A player killed by the test player, placed next to it in the
 * forest with one life point, targeted with a click and attacked, adds the stored player kill score plus the killed
 * player level points. The player scores rows are preserved and the config values are restored by the group reset.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScore
{

    static NPC_KILLS_SWITCH_PATH = 'server/scores/npcKills/enabled';
    static PLAYER_KILL_SCORE_PATH = 'server/scores/obtainedScorePerPlayer';
    static PLAYER_LEVEL_MULTIPLIER_PATH = 'server/scores/obtainedScorePerPlayerLevelMultiplier';
    static VICTIM_CLICK_OFFSET_PIXELS = 16;

    static async fetchTotalScore(gameConfig, playerId)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {player_id: playerId})).reduce(
            (totalScore, scoreRow) => totalScore + Number(scoreRow.total_score),
            0
        );
    }

    static async prepareKillScore(gameConfig, e2eGroup, longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
        );
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {player_id: playerId});
        return {playerId, scoreBefore: await TestKillScore.fetchTotalScore(gameConfig, playerId)};
    }

    static async placeEnemyWithKillScore(page, gameConfig, longRun)
    {
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let placement = await ForestEnemyKill.placeEnemyToKill(page, gameConfig, forestData.sceneTimeout, longRun);
        expect(placement.killScore, 'The placed enemy must have its own kill score').toBeGreaterThan(0);
        await LongRunShowcase.startGameplayRecording(page, longRun);
        await LongRunShowcase.openPanel(page, Selectors.hud.scoresOpen, Selectors.scores.dialog, longRun);
        return placement;
    }

    static async showScore(page, expectedScore, longRun)
    {
        return await LongRunShowcase.showWhen(
            page,
            async () => (await page.locator(Selectors.scores.dialogContent).innerText()).includes(String(expectedScore)),
            'The scores panel must show the score '+expectedScore,
            TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun),
            longRun
        );
    }

    static async runKillScoreTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let scoreData = await TestKillScore.prepareKillScore(gameConfig, e2eGroup, longRun);
        let placement = await TestKillScore.placeEnemyWithKillScore(page, gameConfig, longRun);
        await screenshots.capture(page, 'enemy-with-kill-score-targeted');
        let expectedScore = scoreData.scoreBefore + placement.killScore;
        await TestKillScore.attackUntilScore(page, gameConfig, scoreData.playerId, expectedScore, longRun);
        await screenshots.capture(page, 'kill-score-added');
    }

    static async attackUntilScore(page, gameConfig, playerId, expectedScore, longRun)
    {
        let scoreReached = await RoomObjectsApi.attackTargetUntil(
            page,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => expectedScore === await TestKillScore.fetchTotalScore(gameConfig, playerId),
            TimeConstants.ENEMY_KILL
        );
        expect(scoreReached, 'The kill must add its kill score, the player score must be '+expectedScore).toBe(true);
        return await TestKillScore.showScore(page, expectedScore, longRun);
    }

    static async runDisabledNpcKillsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let scoreData = await TestKillScore.prepareKillScore(gameConfig, e2eGroup, longRun);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, TestKillScore.NPC_KILLS_SWITCH_PATH, 0);
        await TestKillScore.placeEnemyWithKillScore(page, gameConfig, longRun);
        let fetchExperience = async () => (await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName
        )).experience;
        let experienceBefore = await fetchExperience();
        let enemyKilled = await RoomObjectsApi.attackTargetUntil(
            page,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => experienceBefore < await fetchExperience(),
            TimeConstants.ENEMY_KILL
        );
        expect(enemyKilled, 'The enemy must be killed and give its experience').toBe(true);
        await page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(
            await TestKillScore.fetchTotalScore(gameConfig, scoreData.playerId),
            'The disabled enemies kills switch must add no score'
        ).toBe(scoreData.scoreBefore);
        await TestKillScore.showScore(page, scoreData.scoreBefore, longRun);
        await screenshots.capture(page, 'enemy-kill-without-score');
    }

    static async placeTargetedVictim(page, secondPage, gameConfig, longRun)
    {
        let victimName = gameConfig.e2ePlayerName2;
        await Login.loginAndStartGame(
            secondPage,
            gameConfig.e2eUsername2,
            sc.get(gameConfig, 'e2ePassword2', 'root'),
            victimName,
            longRun,
            false,
            Login.FOREST_ROOM_NAME
        );
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        let placement = await RoomObjectsApi.placePlayerNearPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            victimName,
            gameConfig.e2ePlayerName
        );
        expect(placement.position, 'The victim must be placed next to the player: '+sc.get(placement, 'error', ''))
            .toBeTruthy();
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.FOREST_ROOM_NAME, victimName, 1);
        expect(lowered.value, 'The victim life must be lowered: '+sc.get(lowered, 'error', '')).toBe(1);
        let victimSessionId = await (await page.waitForFunction((name) => {
            let playerEngine = window.reldens.getActiveScene()?.player;
            if(!playerEngine?.players){
                return false;
            }
            return Object.keys(playerEngine.players).find(id => name === playerEngine.players[id].playerName) || false;
        }, victimName, {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)})).jsonValue();
        await page.waitForFunction((args) => {
            let playerEngine = window.reldens.getActiveScene()?.player;
            let victimSprite = playerEngine?.players?.[args.sessionId];
            if(!victimSprite){
                return false;
            }
            return args.x - playerEngine.leftOff === victimSprite.x && args.y - playerEngine.topOff === victimSprite.y;
        }, {sessionId: victimSessionId, x: placement.position.x, y: placement.position.y}, {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await LongRunShowcase.startGameplayRecording(page, longRun);
        await LongRunShowcase.openPanel(page, Selectors.hud.scoresOpen, Selectors.scores.dialog, longRun);
        await Phaser.clickPlayerAwayFromOwnPlayer(page, victimSessionId, TestKillScore.VICTIM_CLICK_OFFSET_PIXELS);
        await expect(page.locator(Selectors.combat.targetBox), 'The clicked victim must be targeted').toContainText(
            victimName
        );
        return (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, victimName)).level;
    }

    static async runPlayerKillScoreTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let scoreData = await TestKillScore.prepareKillScore(gameConfig, e2eGroup, longRun);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, forestData.sceneTimeout, longRun);
        let victimLevel = await TestKillScore.placeTargetedVictim(page, secondPage, gameConfig, longRun);
        await screenshots.capture(page, 'player-victim-targeted');
        let expectedScore = scoreData.scoreBefore
            + Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestKillScore.PLAYER_KILL_SCORE_PATH))
            + victimLevel * Number(
                await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestKillScore.PLAYER_LEVEL_MULTIPLIER_PATH)
            );
        expect(expectedScore, 'The player kill must be worth points').toBeGreaterThan(scoreData.scoreBefore);
        await TestKillScore.attackUntilScore(page, gameConfig, scoreData.playerId, expectedScore, longRun);
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
