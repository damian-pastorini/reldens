/**
 *
 * Reldens - Test Kill Score Sequences
 *
 * Tests the kill scores of several kills (KillScoreRulesSteps, the forest Tree with its own "killScore" placed next to
 * the player again for every kill): the first kill creates the player score row and the second kill updates that same
 * row; two kills while the first save is still running (the kill score save delayed for the group) are queued, the
 * second update waits for the first one and both are added to one row with no retry; the enemies kills switch turned
 * off and on again at runtime scores the next kill; the enemy damaged by one player and killed by a second one (both in
 * the forest, the second one with its attack range check off) scores only the second one; and the same enemy killed,
 * respawned (its respawn time shortened for the group and the forest room disposed before the login, so the new room
 * loads it) and killed again scores both kills.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillScoreRulesSteps } = require('./helpers/kill-score-rules-steps');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScoreSequences
{

    static UPDATER_KEY = 'scoresUpdater';
    static QUEUE_DELAY_MS = 8000;
    static RESPAWN_TIME_MS = 2000;
    static DAMAGED_LIFE = 1000;

    static async fetchRowsState(context, playerId)
    {
        return (await KillScoreSteps.fetchScoreRows(context.gameConfig, playerId)).map(row => ({
            id: row.id,
            total: Number(row.total_score),
            npcsKills: Number(row.npcs_kills_count)
        }));
    }

    static async killAgain(context)
    {
        await KillScoreSteps.placeNextEnemy(context.page, context.gameConfig, context.longRun);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
    }

    static async runFirstAndSecondKillTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        expect(
            await TestKillScoreSequences.fetchRowsState(context, scoreData.playerId),
            'The player must start without a score row'
        ).toEqual([]);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        let firstRows = await TestKillScoreSequences.fetchRowsState(context, scoreData.playerId);
        expect(firstRows.map(row => [row.total, row.npcsKills]), 'The first kill creates the score row').toEqual([
            [placement.killScore, 1]
        ]);
        await TestKillScoreSequences.killAgain(context);
        expect(
            await TestKillScoreSequences.fetchRowsState(context, scoreData.playerId),
            'The second kill updates the same row'
        ).toEqual([{id: firstRows[0].id, total: 2 * placement.killScore, npcsKills: 2}]);
    }

    static async runQueuedKillsTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        test.setTimeout(test.info().timeout + 2 * TestKillScoreSequences.QUEUE_DELAY_MS);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreSteps.overrideSubscriberMethod(context, TestKillScoreSequences.UPDATER_KEY, 'saveScore', {
            delayMs: TestKillScoreSequences.QUEUE_DELAY_MS
        });
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.placeNextEnemy(context.page, context.gameConfig, context.longRun);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        expect(
            (await KillScoreSteps.fetchMethodCalls(context, TestKillScoreSequences.UPDATER_KEY, 'saveScore')).called,
            'The second kill update waits in the queue while the first save runs'
        ).toBe(1);
        await expect.poll(
            async () => await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            {
                message: 'Both queued kills are added',
                timeout: 2 * TestKillScoreSequences.QUEUE_DELAY_MS + TimeConstants.SERVER_RESPONSE
            }
        ).toBe(totalBefore + 2 * placement.killScore);
        expect(
            (await KillScoreSteps.fetchMethodCalls(context, TestKillScoreSequences.UPDATER_KEY, 'saveScore')).called,
            'The queued updates are saved with no retry'
        ).toBe(2);
        expect(
            await KillScoreSteps.fetchScoreRows(context.gameConfig, scoreData.playerId),
            'Both kills are on one row'
        ).toHaveLength(1);
    }

    static async runKillsSwitchToggledTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreRulesSteps.overrideScores(context, {'npcKills/enabled': 0});
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            'The kill with the enemies kills off adds no score'
        ).toBe(totalBefore);
        await KillScoreRulesSteps.overrideScores(context, {'npcKills/enabled': 1});
        await TestKillScoreSequences.killAgain(context);
        expect(
            await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            'The next kill with the enemies kills on again is scored with no restart'
        ).toBe(totalBefore + placement.killScore);
    }

    static async runSecondPlayerKillsTest(context)
    {
        let {scoreData, secondScoreData} = await KillScoreRulesSteps.prepareTwoPlayers(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        await GameplayE2eStateApi.setEnemyBodyLife(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            placement.bodyKey,
            TestKillScoreSequences.DAMAGED_LIFE
        );
        let firstTotal = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        let secondTotal = await KillScoreSteps.fetchTotalScore(context.gameConfig, secondScoreData.playerId);
        await KillScoreSteps.attackUntil(
            context.page,
            async () => TestKillScoreSequences.DAMAGED_LIFE > (await GameplayE2eStateApi.fetchEnemyLife(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                placement.bodyKey
            )).life,
            'The first player must damage the enemy'
        );
        await KillScoreRulesSteps.prepareSecondPlayerKill(context, placement.bodyKey);
        await KillScoreSteps.attackUntil(
            context.secondPage,
            async () => secondTotal < await KillScoreSteps.fetchTotalScore(context.gameConfig, secondScoreData.playerId),
            'The second player must land the killing blow and be scored'
        );
        expect(
            await KillScoreSteps.fetchTotalScore(context.gameConfig, secondScoreData.playerId),
            'The player that landed the killing blow gets the kill score'
        ).toBe(secondTotal + placement.killScore);
        expect(
            await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            'The player that only damaged the enemy gets no score'
        ).toBe(firstTotal);
    }

    static async runRespawnedEnemyTest(context)
    {
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'respawn',
            {object_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'objects', {
                client_key: context.gameConfig.e2eEnemyKey,
                room_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME})
            })},
            {respawn_time: TestKillScoreSequences.RESPAWN_TIME_MS}
        );
        await GameplayE2eStateApi.disposeRoom(context.gameConfig, Login.FOREST_ROOM_NAME);
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await expect.poll(
            async () => (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME)).find(
                roomObject => placement.bodyKey === roomObject.bodyKey
            )?.inState,
            {
                message: 'The killed enemy respawns',
                timeout: TestKillScoreSequences.RESPAWN_TIME_MS + TimeConstants.SERVER_RESPONSE
            }
        ).toBe(GameConst.STATUS.ACTIVE);
        let replaced = await RoomObjectsApi.placeAndTargetEnemy(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            placement.enemyKey,
            ForestEnemyKill.ONE_HIT_LIFE,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun),
            true
        );
        expect(replaced.bodyKey, 'The same respawned enemy is targeted again').toBe(placement.bodyKey);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            'Both kills of the respawned enemy are scored'
        ).toBe(totalBefore + 2 * placement.killScore);
    }

    static run()
    {
        test.describe('Kill Score Sequences', () => {
            test('first kill creates the score row and the second kill updates the same row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreSequences.runFirstAndSecondKillTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two kills while the first save runs are queued and both added to one row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreSequences.runQueuedKillsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemies kills switched off and on again scores the next kill', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreSequences.runKillsSwitchToggledTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy damaged by one player and killed by another scores only the killer', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreSequences.runSecondPlayerKillsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('same enemy killed, respawned and killed again scores both kills', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreSequences.runRespawnedEnemyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestKillScoreSequences.run();
