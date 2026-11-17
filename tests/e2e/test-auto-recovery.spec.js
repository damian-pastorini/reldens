/**
 *
 * Reldens - Test Auto Recovery
 *
 * Tests the stats auto recovery: with the players (or the enemies) recovery enabled for the group, a player life (or
 * the life of an idle enemy) set to 1 stays on 1 until the start delay passed and then grows on the next recovery
 * ticks, read from the live server state and, for the player, from the stats sent to the client. The amount, the start
 * delay and the tick time are the stored config values, the long run overrides them (AutoRecoveryShowcase), so its
 * videos show a recovery tick every second, with the life in the HUD and the bars. The enemy case turns off the out
 * of battle rule (covered by the unit tests), so an aggressive enemy that starts a battle with the player during the
 * case still recovers and the result never depends on where the enemies wander. The long run disables the enemies and
 * targets the recovering enemy before the recording starts, so the video shows only the bigger life bars, zoomed in.
 * With a short chase time out for the group, an enemy placed next to the player starts its battle and hits the player,
 * the player escapes next to the object farthest from it, the enemy keeps chasing right after the escape and leaves the
 * battle once the chase time out passed since the last hit, and the player life lowered by the hits stays the same
 * until the start delay passed since that battle end, then it recovers. The long run places a passive enemy (it only
 * hits in melee range and does not start a new battle when the player is near it after the time out) and the player
 * escapes walking, so the video shows the hits, the chase and the enemy going back, with a lower zoom. The battle end
 * is polled every 100ms, the delay check counts from that detection and the next recovery can come 2 seconds after the
 * real battle end in the long run. The recording steps tell the general flow of each case and its recovery values.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { AutoRecoveryShowcase } = require('./helpers/auto-recovery-showcase');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecovery
{

    static LOW_LIFE = 1;
    static LONG_RUN_PLAYER_RECOVERED_LIFE = 30;
    static LONG_RUN_ENEMY_RECOVERED_LIFE = 10;
    static LONG_RUN_CHASE_RECOVERED_LIFE = 10;
    static LONG_RUN_ENEMY_ZOOM = 3;
    static LONG_RUN_CHASE_ZOOM = 1.5;
    static CHASE_TIME_OUT_MS = 3000;
    static CHASE_PLAYER_LIFE = 100;
    static BATTLE_END_POLL_MS = 100;

    static createRecoveryStep(lowerText, recoveredLife, startDelayMs)
    {
        return lowerText+': it recovers '+recoveredLife+' points every '+AutoRecoveryShowcase.TICK_MS+'ms after the '
            +startDelayMs+'ms start delay';
    }

    static async expectDelayedRecovery(page, recoveryTimes, fetchLife, label, lowLife = TestAutoRecovery.LOW_LIFE)
    {
        await page.waitForTimeout(Math.max(
            0,
            recoveryTimes.loweredAt + recoveryTimes.startDelayMs - AutoRecoverySteps.DELAY_CHECK_MARGIN_MS - Date.now()
        ));
        expect(await fetchLife(), label+' must not recover before the start delay').toBe(lowLife);
        await expect.poll(
            fetchLife,
            {message: label+' must recover after the start delay', timeout: recoveryTimes.recoveryTimeout}
        ).toBeGreaterThan(lowLife);
    }

    static async runPlayerRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimes = await AutoRecoverySteps.preparePlayersRecovery(
            gameConfig,
            e2eGroup,
            TestAutoRecovery.LONG_RUN_PLAYER_RECOVERED_LIFE,
            longRun
        );
        let recoveryTimeout = recoveryTimes.recoveryTimeout;
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await AutoRecoveryShowcase.restartRecoveryTicks(gameConfig, Login.FOREST_ROOM_NAME, longRun);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, forestData.sceneTimeout, longRun);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME);
        await AutoRecoveryShowcase.fillPlayerLife(page, gameConfig, Login.FOREST_ROOM_NAME, longRun);
        await LongRunShowcase.startGameplayRecording(page, longRun, 'The player starts with its full life');
        let playerName = gameConfig.e2ePlayerName;
        let fetchPlayer = async () => GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName);
        await LongRunShowcase.showStep(
            page,
            TestAutoRecovery.createRecoveryStep(
                'The player life is lowered to '+TestAutoRecovery.LOW_LIFE,
                TestAutoRecovery.LONG_RUN_PLAYER_RECOVERED_LIFE,
                recoveryTimes.startDelayMs
            ),
            longRun
        );
        recoveryTimes.loweredAt = await AutoRecoverySteps.lowerPlayerLife(
            gameConfig,
            playerName,
            TestAutoRecovery.LOW_LIFE
        );
        await screenshots.capture(page, 'player-life-lowered');
        let fetchServerPlayerLife = async () => (await fetchPlayer()).life;
        await TestAutoRecovery.expectDelayedRecovery(page, recoveryTimes, fetchServerPlayerLife, 'The player life');
        await page.waitForFunction(
            (lowLife) => Number(window.reldens.playerData.stats.hp) > lowLife,
            TestAutoRecovery.LOW_LIFE,
            {timeout: recoveryTimeout}
        );
        await LongRunShowcase.showStep(page, 'The player life grows on every recovery tick', longRun);
        await LongRunShowcase.showWhen(
            page,
            async () => await page.evaluate(
                (shownLife) => Number(window.reldens.playerData.stats.hp) >= shownLife,
                TestAutoRecovery.LOW_LIFE
                + AutoRecoverySteps.RECOVERY_TICKS * TestAutoRecovery.LONG_RUN_PLAYER_RECOVERED_LIFE
            ),
            'The player life must grow on every recovery tick',
            recoveryTimeout * 2,
            longRun
        );
        await screenshots.capture(page, 'player-life-recovered');
    }

    static async runEnemyRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimes = await AutoRecoverySteps.prepareRecovery(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS,
            TestAutoRecovery.LONG_RUN_ENEMY_RECOVERED_LIFE,
            longRun
        );
        let recoveryTimeout = recoveryTimes.recoveryTimeout;
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS+'/onlyOutOfBattle',
            false
        );
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await AutoRecoveryShowcase.restartRecoveryTicks(gameConfig, Login.FOREST_ROOM_NAME, longRun);
        let enemyKey = await AutoRecoverySteps.findEnemyKey(page, gameConfig, longRun);
        if(longRun){
            await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, false, enemyKey);
        }
        await LongRunShowcase.targetObjectNextToPlayer(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            forestData.sceneTimeout,
            longRun
        );
        await AutoRecoveryShowcase.showFullEnemyLife(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            longRun
        );
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'The targeted enemy starts with its full life',
            TestAutoRecovery.LONG_RUN_ENEMY_ZOOM
        );
        await LongRunShowcase.showStep(
            page,
            TestAutoRecovery.createRecoveryStep(
                'The enemy life is lowered to '+TestAutoRecovery.LOW_LIFE,
                TestAutoRecovery.LONG_RUN_ENEMY_RECOVERED_LIFE,
                recoveryTimes.startDelayMs
            ),
            longRun
        );
        let enemyLife = await GameplayE2eStateApi.setEnemyLife(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            TestAutoRecovery.LOW_LIFE
        );
        recoveryTimes.loweredAt = Date.now();
        expect(enemyLife.life, 'The enemy life must be lowered: '+sc.get(enemyLife, 'error', '')).toBe(
            TestAutoRecovery.LOW_LIFE
        );
        expect(enemyLife.totalLife, 'The enemy must have room to recover').toBeGreaterThan(TestAutoRecovery.LOW_LIFE);
        await screenshots.capture(page, 'enemy-life-lowered');
        let fetchServerEnemyLife = async () => (await GameplayE2eStateApi.fetchEnemyLife(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemyLife.bodyKey
        )).life;
        await TestAutoRecovery.expectDelayedRecovery(page, recoveryTimes, fetchServerEnemyLife, 'The enemy life');
        await LongRunShowcase.showStep(page, 'The enemy life grows on every recovery tick', longRun);
        let shownEnemyLife = Math.min(
            enemyLife.totalLife,
            TestAutoRecovery.LOW_LIFE
            + AutoRecoverySteps.RECOVERY_TICKS * TestAutoRecovery.LONG_RUN_ENEMY_RECOVERED_LIFE
        );
        await LongRunShowcase.showWhen(
            page,
            async () => shownEnemyLife <= await fetchServerEnemyLife(),
            'The targeted enemy life must grow on every recovery tick',
            recoveryTimeout * 2,
            longRun
        );
        await screenshots.capture(page, 'enemy-life-recovered');
    }

    static async runChaseTimeOutTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimes = await AutoRecoverySteps.preparePlayersRecovery(
            gameConfig,
            e2eGroup,
            TestAutoRecovery.LONG_RUN_CHASE_RECOVERED_LIFE,
            longRun
        );
        let chaseTimeOutMs = longRun ? AutoRecoveryShowcase.CHASE_TIME_OUT_MS : TestAutoRecovery.CHASE_TIME_OUT_MS;
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            ActionsConst.PVE.CONFIG_PATHS.CHASE_TIME_OUT,
            chaseTimeOutMs
        );
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await AutoRecoveryShowcase.restartRecoveryTicks(gameConfig, Login.FOREST_ROOM_NAME, longRun);
        await AutoRecoveryShowcase.setPageLifeBar(page, AutoRecoveryShowcase.CHASE_LIFE_BAR, longRun);
        let placement = await AutoRecoverySteps.placeChasingEnemy(page, gameConfig, forestData.sceneTimeout, longRun);
        let playerName = gameConfig.e2ePlayerName;
        let fetchPlayer = async () => GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName);
        let fetchPlayerLife = async () => (await fetchPlayer()).life;
        let fetchInBattle = async () => (await AutoRecoverySteps.fetchFightingEnemy(
            gameConfig,
            placement.enemyKey
        )).inBattle;
        await ForestEnemyKill.lowerPlayerLife(page, gameConfig, TestAutoRecovery.CHASE_PLAYER_LIFE);
        let lifeBefore = await fetchPlayerLife();
        await LongRunShowcase.startGameplayRecording(
            page,
            longRun,
            'The enemy starts its battle and hits the player: no recovery during the battle',
            TestAutoRecovery.LONG_RUN_CHASE_ZOOM
        );
        let battle = await RoomObjectsApi.startEnemyBattle(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            placement.enemyKey
        );
        expect(battle.enemyKey, 'The placed enemy battle must start: '+sc.get(battle, 'error', '')).toBe(
            placement.enemyKey
        );
        await expect.poll(fetchPlayerLife, {message: 'The enemy must hit the player'}).toBeLessThan(lifeBefore);
        await LongRunShowcase.showStep(
            page,
            'The player runs away: the enemy chases it for '+chaseTimeOutMs+'ms since its last hit',
            longRun
        );
        await AutoRecoverySteps.escapeFromEnemy(page, gameConfig, placement.enemyKey, forestData.sceneTimeout, longRun);
        expect(await fetchInBattle(), 'The enemy must keep chasing the player right after the escape').toBe(1);
        await screenshots.capture(page, 'player-escaped-from-enemy');
        await expect.poll(
            fetchInBattle,
            {
                message: 'The enemy must leave the battle once the chase time out passed since the last hit',
                timeout: chaseTimeOutMs + TimeConstants.SERVER_RESPONSE,
                intervals: [TestAutoRecovery.BATTLE_END_POLL_MS]
            }
        ).toBe(0);
        recoveryTimes.loweredAt = Date.now();
        let lifeAfterBattle = await fetchPlayerLife();
        expect(lifeAfterBattle, 'The player life must not recover during the battle').toBeLessThan(lifeBefore);
        await AutoRecoveryShowcase.stopEscapeWalk(page, gameConfig, Login.FOREST_ROOM_NAME, longRun);
        await LongRunShowcase.showStep(
            page,
            TestAutoRecovery.createRecoveryStep(
                'The battle ended',
                TestAutoRecovery.LONG_RUN_CHASE_RECOVERED_LIFE,
                recoveryTimes.startDelayMs
            ),
            longRun
        );
        await TestAutoRecovery.expectDelayedRecovery(
            page,
            recoveryTimes,
            fetchPlayerLife,
            'The player life after the battle',
            lifeAfterBattle
        );
        await LongRunShowcase.showStep(page, 'The player life grows on every recovery tick', longRun);
        let shownLife = lifeAfterBattle
            + AutoRecoverySteps.RECOVERY_TICKS * TestAutoRecovery.LONG_RUN_CHASE_RECOVERED_LIFE;
        await LongRunShowcase.showWhen(
            page,
            async () => shownLife <= await fetchPlayerLife(),
            'The player life must grow on every recovery tick after the battle',
            recoveryTimes.recoveryTimeout * 2,
            longRun
        );
        await screenshots.capture(page, 'player-life-recovered-after-the-battle');
    }

    static run()
    {
        test.describe('Auto Recovery', () => {
            test('player life recovers over time with the players auto recovery enabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecovery.runPlayerRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy life recovers over time with the enemies auto recovery enabled', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecovery.runEnemyRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('escaped player is left by the chasing enemy and recovers after the battle delay', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecovery.runChaseTimeOutTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAutoRecovery.run();
