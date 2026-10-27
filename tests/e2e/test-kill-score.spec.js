/**
 *
 * Reldens - Test Kill Score
 *
 * Tests the points per kill: the forest Tree has its own "killScore" private param and the stored config uses the NPC
 * custom score, so killing a Tree placed next to the player with one hit point adds exactly that score to the player
 * scores row. The player scores rows are preserved and restored by the group reset.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScore
{

    static async fetchTotalScore(gameConfig, playerId)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'scores', {player_id: playerId})).reduce(
            (totalScore, scoreRow) => totalScore + Number(scoreRow.total_score),
            0
        );
    }

    static async runKillScoreTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
        );
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'scores', {player_id: playerId});
        let scoreBefore = await TestKillScore.fetchTotalScore(gameConfig, playerId);
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let placement = await ForestEnemyKill.placeOneHitEnemy(page, gameConfig, forestData.sceneTimeout);
        expect(placement.killScore, 'The placed enemy must have its own kill score').toBeGreaterThan(0);
        await screenshots.capture(page, 'enemy-with-kill-score-targeted');
        let expectedScore = scoreBefore + placement.killScore;
        let scoreReached = await RoomObjectsApi.attackTargetUntil(
            page,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => expectedScore === await TestKillScore.fetchTotalScore(gameConfig, playerId),
            TimeConstants.ENEMY_KILL
        );
        expect(scoreReached, 'The kill must add the enemy kill score to the player score').toBe(true);
        await screenshots.capture(page, 'kill-score-added');
    }

    static run()
    {
        test.describe('Kill Score', () => {
            test('killing an enemy with its own kill score adds that score to the player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScore.runKillScoreTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestKillScore.run();
