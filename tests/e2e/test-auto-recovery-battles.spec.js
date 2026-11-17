/**
 *
 * Reldens - Test Auto Recovery Battles
 *
 * Tests the players auto recovery out of battle rule with the fast cases of AutoRecoverySteps (1 second tick, 3 seconds
 * start delay, every enemy disabled): the player is put in the battle of a disabled forest enemy by adding it to that
 * enemy battle players for the group (the battle never deals damage), so with onlyOutOfBattle on (and with its config
 * key removed, treated as on) the lowered life stays constant over several ticks, with onlyOutOfBattle off it recovers
 * during the battle; in the battles of two enemies the life does not recover until both ended, and then only once the
 * delay passed since the second one ended; and with the second player idle in the same room, the second player
 * recovers while the first one in battle does not.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Login } = require('./helpers/login');
const { ActionsConst } = require('../../lib/actions/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryBattles
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static ONLY_OUT_OF_BATTLE_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS+'/onlyOutOfBattle';
    static LOW_LIFE = 1;
    static QUIET_TICKS = 3;
    static POLL_MS = 100;

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryBattles.PLAYERS_PATH),
            configValues
        ));
        await AutoRecoverySteps.enterForestWithFastTicks(context);
    }

    static async fetchLife(gameConfig)
    {
        return (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName)).life;
    }

    static async fetchEnemiesBodyKeys(gameConfig, count)
    {
        let enemies = (await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME)).filter(
            roomObject => ObjectsConst.TYPE_ENEMY === roomObject.type
        );
        expect(enemies.length, 'The forest must have '+count+' enemies').toBeGreaterThanOrEqual(count);
        return enemies.slice(0, count).map(enemy => enemy.bodyKey);
    }

    static async setInBattle(context, bodyKey, playersNames)
    {
        let battlePlayers = {};
        for(let playerName of playersNames){
            battlePlayers[await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: playerName})] = true;
        }
        let changed = await GameplayE2eStateApi.changeEnemyBattle(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            bodyKey,
            {inBattleWithPlayers: battlePlayers}
        );
        expect(changed.changed, 'The enemy battle players must change: '+changed.error).toEqual(['inBattleWithPlayers']);
    }

    static async lowerLife(gameConfig, life)
    {
        return await AutoRecoverySteps.lowerPlayerLife(gameConfig, gameConfig.e2ePlayerName, life);
    }

    static recoveryWindowMs()
    {
        return AutoRecoverySteps.FAST_START_DELAY_MS + TestAutoRecoveryBattles.QUIET_TICKS * AutoRecoverySteps.FAST_TICK_MS;
    }

    static async expectLifeKept(context, gameConfig, waitMs, message)
    {
        await context.page.waitForTimeout(waitMs);
        expect(await TestAutoRecoveryBattles.fetchLife(gameConfig), message).toBe(TestAutoRecoveryBattles.LOW_LIFE);
    }

    static async expectRecovered(gameConfig, timeout, message)
    {
        await expect.poll(
            async () => await TestAutoRecoveryBattles.fetchLife(gameConfig),
            {message, timeout, intervals: [TestAutoRecoveryBattles.POLL_MS]}
        ).toBeGreaterThan(TestAutoRecoveryBattles.LOW_LIFE);
    }

    static async runInBattleConstantTest(context, configChange)
    {
        await TestAutoRecoveryBattles.startCase(context);
        await configChange();
        let [bodyKey] = await TestAutoRecoveryBattles.fetchEnemiesBodyKeys(context.gameConfig, 1);
        await TestAutoRecoveryBattles.setInBattle(context, bodyKey, [context.gameConfig.e2ePlayerName]);
        await TestAutoRecoveryBattles.lowerLife(context.gameConfig, TestAutoRecoveryBattles.LOW_LIFE);
        await TestAutoRecoveryBattles.expectLifeKept(
            context,
            context.gameConfig,
            TestAutoRecoveryBattles.recoveryWindowMs(),
            'The life stays constant while the player is in a battle with no damage'
        );
    }

    static async runOutOfBattleOffTest(context)
    {
        await TestAutoRecoveryBattles.startCase(context, {[TestAutoRecoveryBattles.ONLY_OUT_OF_BATTLE_PATH]: false});
        let [bodyKey] = await TestAutoRecoveryBattles.fetchEnemiesBodyKeys(context.gameConfig, 1);
        await TestAutoRecoveryBattles.setInBattle(context, bodyKey, [context.gameConfig.e2ePlayerName]);
        await TestAutoRecoveryBattles.lowerLife(context.gameConfig, TestAutoRecoveryBattles.LOW_LIFE);
        await TestAutoRecoveryBattles.expectRecovered(
            context.gameConfig,
            TestAutoRecoveryBattles.recoveryWindowMs(),
            'With onlyOutOfBattle off the player recovers during the battle'
        );
    }

    static async runTwoBattlesTest(context)
    {
        await TestAutoRecoveryBattles.startCase(context);
        let bodyKeys = await TestAutoRecoveryBattles.fetchEnemiesBodyKeys(context.gameConfig, 2);
        for(let bodyKey of bodyKeys){
            await TestAutoRecoveryBattles.setInBattle(context, bodyKey, [context.gameConfig.e2ePlayerName]);
        }
        await TestAutoRecoveryBattles.lowerLife(context.gameConfig, TestAutoRecoveryBattles.LOW_LIFE);
        await TestAutoRecoveryBattles.setInBattle(context, bodyKeys[0], []);
        await TestAutoRecoveryBattles.expectLifeKept(
            context,
            context.gameConfig,
            TestAutoRecoveryBattles.recoveryWindowMs(),
            'No recovery while the second battle is still open'
        );
        await TestAutoRecoveryBattles.setInBattle(context, bodyKeys[1], []);
        await TestAutoRecoveryBattles.expectLifeKept(
            context,
            context.gameConfig,
            AutoRecoverySteps.FAST_START_DELAY_MS - 1000,
            'No recovery before the delay passed since the second battle ended'
        );
        await TestAutoRecoveryBattles.expectRecovered(
            context.gameConfig,
            TestAutoRecoveryBattles.recoveryWindowMs(),
            'The life recovers once both battles ended and the delay passed'
        );
    }

    static async runInBattleAndIdleTest(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryBattles.PLAYERS_PATH)
        );
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await AutoRecoverySteps.restartFastTicks(context);
        let [bodyKey] = await TestAutoRecoveryBattles.fetchEnemiesBodyKeys(context.gameConfig, 1);
        await TestAutoRecoveryBattles.setInBattle(context, bodyKey, [context.gameConfig.e2ePlayerName]);
        await TestAutoRecoveryBattles.lowerLife(context.gameConfig, TestAutoRecoveryBattles.LOW_LIFE);
        await TestAutoRecoveryBattles.lowerLife(secondContext.gameConfig, TestAutoRecoveryBattles.LOW_LIFE);
        await TestAutoRecoveryBattles.expectRecovered(
            secondContext.gameConfig,
            TestAutoRecoveryBattles.recoveryWindowMs(),
            'The idle player recovers'
        );
        expect(
            await TestAutoRecoveryBattles.fetchLife(context.gameConfig),
            'The player in battle does not recover'
        ).toBe(TestAutoRecoveryBattles.LOW_LIFE);
    }

    static run()
    {
        test.describe('Auto Recovery Battles', () => {
            test('player in a battle with no damage keeps its lowered life with onlyOutOfBattle on', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryBattles.runInBattleConstantTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    async () => true
                );
            });
            test('onlyOutOfBattle config key removed is treated as on', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryBattles.runInBattleConstantTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    async () => await E2eSeedAndRestoreApi.removeConfig(
                        gameConfig,
                        e2eGroup,
                        TestAutoRecoveryBattles.ONLY_OUT_OF_BATTLE_PATH
                    )
                );
            });
            test('onlyOutOfBattle off recovers the player during the battle', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryBattles.runOutOfBattleOffTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('battles with two enemies block the recovery until both ended and the delay passed', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryBattles.runTwoBattlesTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('idle player recovers while the player in battle in the same room does not', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryBattles.runInBattleAndIdleTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestAutoRecoveryBattles.run();
