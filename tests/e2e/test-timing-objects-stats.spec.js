/**
 *
 * Reldens - Test Timing Objects Stats
 *
 * Tests the hit rule of a timing object on the first forest mining rock (TimingMiningSteps) and what the clients show:
 * with the hit rule off (changed for the group on the live rock) an enemy hit keeps the mining and it rewards; a life
 * raised during the mining keeps it and a later lower life cancels it; a life saved with the same value and another
 * stat lowered keep it; the miner client shows the progress bar and the tool while mining and removes both on the
 * cancel; and the attacker that cancels the mining with its hit and an unrelated client of the room get no timing
 * message, no progress bar and no tool.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsStats
{

    static ENEMY_OBJECT_TYPE = 4;
    static LIFE_STEP = 1;
    static RULE_CHECK_MS = 500;
    static SECOND_STAT_KEY = 'mp';

    static async fetchPlayer(gameConfig)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName);
    }

    static async setLife(gameConfig, life)
    {
        let changed = await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName, life);
        expect(changed.value, 'The miner life must change: '+changed.error).toBe(life);
    }

    static async expectStillMining(page, message)
    {
        await page.waitForTimeout(TestTimingObjectsStats.RULE_CHECK_MS);
        expect(await TimingObjectSession.fetchRecordedActions(page), message).toEqual([TimingMiningSteps.START]);
    }

    static async runHitRuleOffTest(context)
    {
        let passiveEnemyArea = BaseE2eTest.loadRoomEntries(Login.FOREST_ROOM_NAME, ['respawnAreas']).find(
            area => TestTimingObjectsStats.ENEMY_OBJECT_TYPE === area.childObjectType && !area.isAggressive
        );
        expect(passiveEnemyArea, 'The forest must have a passive enemy').toBeTruthy();
        let mining = await TimingMiningSteps.prepare(context, {cancelOnHit: false});
        let lifeBefore = (await TestTimingObjectsStats.fetchPlayer(context.gameConfig)).life;
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        let enemyAttack = await RoomObjectsApi.startEnemyAttack(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            passiveEnemyArea.assetKey
        );
        expect(enemyAttack.enemyKey, 'The enemy attack must start: '+enemyAttack.error).toBeTruthy();
        await expect.poll(
            async () => (await TestTimingObjectsStats.fetchPlayer(context.gameConfig)).life,
            {message: 'The enemy hits the miner', timeout: mining.serverTimeout}
        ).toBeLessThan(lifeBefore);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The hit rule off keeps the mining');
    }

    static async runRaisedLifeTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let life = (await TestTimingObjectsStats.fetchPlayer(context.gameConfig)).life;
        await TestTimingObjectsStats.setLife(context.gameConfig, life - TestTimingObjectsStats.LIFE_STEP * 2);
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TestTimingObjectsStats.setLife(context.gameConfig, life - TestTimingObjectsStats.LIFE_STEP);
        await TestTimingObjectsStats.expectStillMining(context.page, 'A raised life keeps the mining');
        await TestTimingObjectsStats.setLife(context.gameConfig, life - TestTimingObjectsStats.LIFE_STEP * 3);
        await TimingMiningSteps.expectCancelled(context.page, mining, 'A lower life after the raise cancels');
    }

    static async runSameLifeTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let life = (await TestTimingObjectsStats.fetchPlayer(context.gameConfig)).life;
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await TestTimingObjectsStats.setLife(context.gameConfig, life);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'The same life keeps the mining');
    }

    static async runOtherStatTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let player = await TestTimingObjectsStats.fetchPlayer(context.gameConfig);
        let statKey = TestTimingObjectsStats.SECOND_STAT_KEY;
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await GameplayE2eStateApi.setPlayerStats(context.gameConfig, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName, {
            [statKey]: player.stats[statKey] - TestTimingObjectsStats.LIFE_STEP
        });
        await expect.poll(
            async () => (await TestTimingObjectsStats.fetchPlayer(context.gameConfig)).stats[statKey],
            {message: 'The other stat is lowered', timeout: mining.serverTimeout}
        ).toBe(player.stats[statKey] - TestTimingObjectsStats.LIFE_STEP);
        await TimingMiningSteps.expectCompleted(context.page, mining, 'Another stat lowered keeps the mining');
    }

    static async runClientCancelTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        let life = (await TestTimingObjectsStats.fetchPlayer(context.gameConfig)).life;
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await expect.poll(
            async () => await TimingMiningSteps.fetchClientTiming(context.page, mining.rockKey),
            {message: 'The miner shows the progress bar and the tool', timeout: mining.serverTimeout}
        ).toEqual({hasBar: true, hasBarInterval: true, hasTool: true});
        await TestTimingObjectsStats.setLife(context.gameConfig, life - TestTimingObjectsStats.LIFE_STEP);
        await TimingObjectSession.waitForTimingAction(context.page, TimingMiningSteps.CANCEL, mining.serverTimeout);
        expect(await TimingMiningSteps.fetchClientTiming(context.page, mining.rockKey), 'The cancel removes both')
            .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
    }

    static async runOtherClientsTest(context)
    {
        let mining = await TimingMiningSteps.prepare(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        let minerSessionId = await DeathObserverSteps.fetchSessionId(context.page);
        await Login.loginAndStartGame(
            context.secondPage,
            context.gameConfig.e2eUsername2,
            context.gameConfig.e2ePassword2 || context.gameConfig.e2ePassword,
            context.gameConfig.e2ePlayerName2,
            context.longRun,
            false,
            Login.FOREST_ROOM_NAME
        );
        let thirdPage = await KillScoreSteps.loginThirdInForest(context);
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName2,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The attacker must be placed next to the miner: '+placed.error).toBeTruthy();
        await Phaser.waitForPlayerBySessionId(context.secondPage, minerSessionId, TimeConstants.SCENE_LOAD);
        for(let otherPage of [context.secondPage, thirdPage]){
            await TimingObjectSession.recordTimingActions(otherPage);
        }
        await TimingObjectSession.startTiming(context.page, mining.rockKey, mining.serverTimeout);
        await context.secondPage.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            minerSessionId
        );
        let isCancelled = await RoomObjectsApi.attackTargetUntil(
            context.secondPage,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => (await TimingObjectSession.fetchRecordedActions(context.page)).includes(TimingMiningSteps.CANCEL),
            mining.duration
        );
        expect(isCancelled, 'The attacker hit cancels the mining').toBe(true);
        await context.page.waitForTimeout(mining.duration);
        for(let otherPage of [context.secondPage, thirdPage]){
            expect(await TimingObjectSession.fetchRecordedActions(otherPage), 'No timing message').toEqual([]);
            expect(await TimingMiningSteps.fetchClientTiming(otherPage, mining.rockKey), 'No bar and no tool')
                .toEqual({hasBar: false, hasBarInterval: false, hasTool: false});
        }
    }

    static run()
    {
        test.describe('Timing Objects Stats', () => {
            test('hit rule off: an enemy hit keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsStats.runHitRuleOffTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('raised life keeps the mining and a later lower life cancels it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsStats.runRaisedLifeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('life saved with the same value keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsStats.runSameLifeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('another stat lowered keeps the mining', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsStats.runOtherStatTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('miner client removes the progress bar and the tool on the cancel', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsStats.runClientCancelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('attacker and unrelated clients get no timing message, bar or tool', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestTimingObjectsStats.runOtherClientsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestTimingObjectsStats.run();
