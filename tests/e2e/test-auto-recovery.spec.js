/**
 *
 * Reldens - Test Auto Recovery
 *
 * Tests the stats auto recovery: with the players (or the enemies) recovery enabled for the group, a player life (or
 * the life of an idle enemy) set to 1 stays on 1 until the stored start delay passed and then grows on the next
 * recovery ticks, read from the live server state and, for the player, from the stats sent to the client. The amount,
 * the start delay and the tick time are the stored config values. The enemy case turns off the out of battle rule
 * (covered by the unit tests), so an aggressive enemy that starts a battle with the player during the case still
 * recovers and the result never depends on where the enemies wander. The long run disables the enemies and targets the
 * recovering enemy before the recording starts, so the video shows only the life bars. With a short chase time out for
 * the group, an enemy placed next to the player starts its battle and hits the player, the player escapes next to the
 * object farthest from it, the enemy keeps chasing right after the escape and leaves the battle once the chase time
 * out passed since the last hit, and the player life lowered by the hits stays the same until the stored start delay
 * passed since that battle end, then it recovers.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { LongRunShowcase } = require('./helpers/long-run-showcase');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecovery
{

    static LOW_LIFE = 1;
    static RECOVERY_TICKS = 3;
    static DELAY_CHECK_MARGIN_MS = 1000;
    static LONG_RUN_PLAYER_RECOVERED_LIFE = 30;
    static LONG_RUN_ENEMY_RECOVERED_LIFE = 10;
    static CHASE_TIME_OUT_MS = 3000;
    static CHASE_PLAYER_LIFE = 100;

    static async expectDelayedRecovery(page, recoveryTimes, fetchLife, label, lowLife = TestAutoRecovery.LOW_LIFE)
    {
        await page.waitForTimeout(Math.max(
            0,
            recoveryTimes.loweredAt + recoveryTimes.startDelayMs - TestAutoRecovery.DELAY_CHECK_MARGIN_MS - Date.now()
        ));
        expect(await fetchLife(), label+' must not recover before the start delay').toBe(lowLife);
        await expect.poll(
            fetchLife,
            {message: label+' must recover after the start delay', timeout: recoveryTimes.recoveryTimeout}
        ).toBeGreaterThan(lowLife);
    }

    static async prepareRecovery(gameConfig, e2eGroup, recoveryConfigPath, longRunRecoveredLife, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, recoveryConfigPath+'/enabled', true);
        if(longRun){
            await E2eSeedAndRestoreApi.overrideConfig(
                gameConfig,
                e2eGroup,
                recoveryConfigPath+'/properties/hp',
                longRunRecoveredLife
            );
        }
        let tickMs = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS)
        );
        expect(tickMs, 'The recovery tick time must be stored').toBeGreaterThan(0);
        expect(
            Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, recoveryConfigPath+'/properties/hp')),
            'The configured recovered life must be positive'
        ).toBeGreaterThan(0);
        let startDelayMs = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, recoveryConfigPath+'/startDelayMs')
        );
        expect(startDelayMs, 'The recovery start delay must be stored').toBeGreaterThan(
            TestAutoRecovery.DELAY_CHECK_MARGIN_MS
        );
        let recoveryTimeout = startDelayMs + tickMs * TestAutoRecovery.RECOVERY_TICKS;
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun) + recoveryTimeout * 2
        );
        return {startDelayMs, recoveryTimeout};
    }

    static async preparePlayersRecovery(gameConfig, e2eGroup, longRun)
    {
        return await TestAutoRecovery.prepareRecovery(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS,
            TestAutoRecovery.LONG_RUN_PLAYER_RECOVERED_LIFE,
            longRun
        );
    }

    static async lowerPlayerLife(gameConfig, playerName, life)
    {
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(gameConfig, Login.FOREST_ROOM_NAME, playerName, life);
        expect(lowered.value, 'The player life must be lowered: '+sc.get(lowered, 'error', '')).toBe(life);
        return Date.now();
    }

    static async runPlayerRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimes = await TestAutoRecovery.preparePlayersRecovery(gameConfig, e2eGroup, longRun);
        let recoveryTimeout = recoveryTimes.recoveryTimeout;
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, forestData.sceneTimeout, longRun);
        await LongRunShowcase.startGameplayRecording(page, longRun);
        let playerName = gameConfig.e2ePlayerName;
        recoveryTimes.loweredAt = await TestAutoRecovery.lowerPlayerLife(gameConfig, playerName, TestAutoRecovery.LOW_LIFE);
        await screenshots.capture(page, 'player-life-lowered');
        let fetchServerPlayerLife = async () => (await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName
        )).life;
        await TestAutoRecovery.expectDelayedRecovery(page, recoveryTimes, fetchServerPlayerLife, 'The player life');
        await page.waitForFunction(
            (lowLife) => Number(window.reldens.playerData.stats.hp) > lowLife,
            TestAutoRecovery.LOW_LIFE,
            {timeout: recoveryTimeout}
        );
        await LongRunShowcase.showWhen(
            page,
            async () => await page.evaluate(
                (shownLife) => Number(window.reldens.playerData.stats.hp) >= shownLife,
                TestAutoRecovery.LOW_LIFE
                + TestAutoRecovery.RECOVERY_TICKS * TestAutoRecovery.LONG_RUN_PLAYER_RECOVERED_LIFE
            ),
            'The player life must grow on every recovery tick',
            recoveryTimeout * 2,
            longRun
        );
        await screenshots.capture(page, 'player-life-recovered');
    }

    static async runEnemyRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimes = await TestAutoRecovery.prepareRecovery(
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
        let enemyKey = await LongRunShowcase.findCentralPassiveEnemyKey(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2eEnemyKey,
            longRun
        );
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
        await LongRunShowcase.startGameplayRecording(page, longRun);
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
        let shownEnemyLife = Math.min(
            enemyLife.totalLife,
            TestAutoRecovery.LOW_LIFE + TestAutoRecovery.RECOVERY_TICKS * TestAutoRecovery.LONG_RUN_ENEMY_RECOVERED_LIFE
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

    static async fetchFightingEnemy(gameConfig, enemyKey)
    {
        return (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).find(
            roomObject => enemyKey === roomObject.key
        );
    }

    static async escapeFromEnemy(page, gameConfig, enemyKey, timeout)
    {
        let roomObjects = await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME);
        let fightingEnemy = roomObjects.find(roomObject => enemyKey === roomObject.key);
        let escapeObjects = await LongRunShowcase.filterCenteredObjects(
            page,
            roomObjects.filter(roomObject => enemyKey !== roomObject.key)
        );
        let farObject = [...escapeObjects.sort(
            (objectA, objectB) => Math.hypot(objectB.x - fightingEnemy.x, objectB.y - fightingEnemy.y)
                - Math.hypot(objectA.x - fightingEnemy.x, objectA.y - fightingEnemy.y)
        )].shift();
        expect(farObject, 'The forest must have an object far from the fighting enemy').toBeTruthy();
        let escape = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            farObject.key,
            timeout
        );
        expect(escape.reached, 'The player must escape far from the enemy: '+sc.toJsonString(escape)).toBe(true);
    }

    static async runChaseTimeOutTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimes = await TestAutoRecovery.preparePlayersRecovery(gameConfig, e2eGroup, longRun);
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            ActionsConst.PVE.CONFIG_PATHS.CHASE_TIME_OUT,
            TestAutoRecovery.CHASE_TIME_OUT_MS
        );
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        await LongRunShowcase.moveToCentralArea(page, gameConfig, Login.FOREST_ROOM_NAME, forestData.sceneTimeout, longRun);
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2eEnemyKey,
            ForestEnemyKill.FULL_LIFE,
            forestData.sceneTimeout,
            true
        );
        expect(placement.targeted, 'The placed enemy must be targeted: '+sc.toJsonString(placement)).toBe(true);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, false, placement.bodyKey);
        let playerName = gameConfig.e2ePlayerName;
        let fetchPlayerLife = async () => (await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName
        )).life;
        await TestAutoRecovery.lowerPlayerLife(gameConfig, playerName, TestAutoRecovery.CHASE_PLAYER_LIFE);
        let lifeBefore = await fetchPlayerLife();
        await LongRunShowcase.startGameplayRecording(page, longRun);
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
        await TestAutoRecovery.escapeFromEnemy(page, gameConfig, placement.enemyKey, forestData.sceneTimeout);
        expect(
            (await TestAutoRecovery.fetchFightingEnemy(gameConfig, placement.enemyKey)).inBattle,
            'The enemy must keep chasing the player right after the escape'
        ).toBe(1);
        await screenshots.capture(page, 'player-escaped-from-enemy');
        await expect.poll(
            async () => (await TestAutoRecovery.fetchFightingEnemy(gameConfig, placement.enemyKey)).inBattle,
            {
                message: 'The enemy must leave the battle once the chase time out passed since the last hit',
                timeout: TestAutoRecovery.CHASE_TIME_OUT_MS + TimeConstants.SERVER_RESPONSE
            }
        ).toBe(0);
        recoveryTimes.loweredAt = Date.now();
        let lifeAfterBattle = await fetchPlayerLife();
        expect(lifeAfterBattle, 'The player life must not recover during the battle').toBeLessThan(lifeBefore);
        await TestAutoRecovery.expectDelayedRecovery(
            page,
            recoveryTimes,
            fetchPlayerLife,
            'The player life after the battle',
            lifeAfterBattle
        );
        await LongRunShowcase.pause(page, longRun);
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
