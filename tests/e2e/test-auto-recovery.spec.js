/**
 *
 * Reldens - Test Auto Recovery
 *
 * Tests the theme stats auto recovery: with the players (or the enemies) recovery enabled for the group, a player life
 * (or the life of an idle enemy) set to 1 grows on the next recovery ticks, read from the live server state and, for
 * the player, from the stats sent to the client. The amount and the tick time are the stored config values. The enemy
 * case turns off the out of battle rule (covered by the unit tests), so an aggressive enemy that starts a battle with
 * the player during the case still recovers and the result never depends on where the enemies wander.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecovery
{

    static LOW_LIFE = 1;
    static RECOVERY_TICKS = 3;

    static async prepareRecovery(gameConfig, e2eGroup, recoveryConfigPath, longRun)
    {
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, recoveryConfigPath+'/enabled', true);
        let tickMs = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS)
        );
        expect(tickMs, 'The recovery tick time must be stored').toBeGreaterThan(0);
        expect(
            Number(await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, recoveryConfigPath+'/properties/hp')),
            'The configured recovered life must be positive'
        ).toBeGreaterThan(0);
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + tickMs * TestAutoRecovery.RECOVERY_TICKS
        );
        return tickMs * TestAutoRecovery.RECOVERY_TICKS;
    }

    static async runPlayerRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimeout = await TestAutoRecovery.prepareRecovery(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS,
            longRun
        );
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        await RoomObjectsApi.disableEnemies(gameConfig, Login.FOREST_ROOM_NAME, true);
        let playerName = gameConfig.e2ePlayerName;
        let lowered = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            playerName,
            TestAutoRecovery.LOW_LIFE
        );
        expect(lowered.value, 'The player life must be lowered: '+sc.get(lowered, 'error', '')).toBe(
            TestAutoRecovery.LOW_LIFE
        );
        await screenshots.capture(page, 'player-life-lowered');
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, playerName)).life,
            {message: 'The server player life must recover', timeout: recoveryTimeout}
        ).toBeGreaterThan(TestAutoRecovery.LOW_LIFE);
        await page.waitForFunction(
            (lowLife) => Number(window.reldens.playerData.stats.hp) > lowLife,
            TestAutoRecovery.LOW_LIFE,
            {timeout: recoveryTimeout}
        );
        await screenshots.capture(page, 'player-life-recovered');
    }

    static async runEnemyRecoveryTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let recoveryTimeout = await TestAutoRecovery.prepareRecovery(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS,
            longRun
        );
        await E2eSeedAndRestoreApi.overrideConfig(
            gameConfig,
            e2eGroup,
            ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS+'/onlyOutOfBattle',
            false
        );
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        let enemyLife = await GameplayE2eStateApi.setEnemyLife(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2eEnemyKey,
            TestAutoRecovery.LOW_LIFE
        );
        expect(enemyLife.life, 'The enemy life must be lowered: '+sc.get(enemyLife, 'error', '')).toBe(
            TestAutoRecovery.LOW_LIFE
        );
        expect(enemyLife.totalLife, 'The enemy must have room to recover').toBeGreaterThan(TestAutoRecovery.LOW_LIFE);
        await screenshots.capture(page, 'enemy-life-lowered');
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchEnemyLife(
                gameConfig,
                Login.FOREST_ROOM_NAME,
                enemyLife.bodyKey
            )).life,
            {message: 'The server enemy life must recover', timeout: recoveryTimeout}
        ).toBeGreaterThan(TestAutoRecovery.LOW_LIFE);
        await screenshots.capture(page, 'enemy-life-recovered');
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
        });
    }

}

TestAutoRecovery.run();
