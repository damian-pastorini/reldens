/**
 *
 * Reldens - Test Auto Recovery Enemy Events
 *
 * Tests the auto recovery around the enemy battles with a 1 second tick and a 3 seconds start delay for the group (the
 * fast cases of AutoRecoverySteps); CombatSkillCasting enters the forest with the configured enemy placed next to the
 * player (its aggression held, every other enemy disabled) and the attack skill with its range check off: a player that
 * kills the enemy it fought waits the full delay from the kill before recovering; with the enemies recovery amounts
 * only for a stat that is not the life (on a passive enemy kept alone in the forest, out of any battle), the lowered
 * enemy stat recovers, its lowered life stays and no life bar update is sent for that enemy;
 * an enemy killed at low life respawns (its respawn time shortened for the group and the forest room disposed before
 * the login, so the new room loads it) with its full life and sends no recovery update afterwards; and an enemy in
 * battle with a lowered life recovers a full delay after the battle ended by the player leaving the game, by the player
 * changing room or by the player death (the player left with one life point and killed by the attacks of that same
 * enemy, never placed again, so its lowered life is kept; the stored rooms never dispose when empty, so the forest keeps
 * ticking).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { AutoRecoveryShowcase } = require('./helpers/auto-recovery-showcase');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { UsersConst } = require('../../lib/users/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryEnemyEvents
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static OBJECTS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS;
    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static LOW_LIFE = 1;
    static PLAYER_LIFE = 100;
    static ENEMY_LOWERED_LIFE = 5;
    static LOWERED_STAT_KEY = 'atk';
    static LIFE_STAT_KEY = 'hp';
    static LOWERED_STAT_VALUE = 1;
    static RESPAWN_TIME_MS = 2000;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;
    static BEFORE_DELAY_MS = 2000;

    static async startCase(context, configValues)
    {
        await AutoRecoverySteps.prepareFastRecovery(context, configValues);
        let combat = await CombatSkillCasting.prepareEnemyTarget(context.page, context.gameConfig, context.longRun);
        await AutoRecoveryShowcase.requestTicksRestart(context.gameConfig, Login.FOREST_ROOM_NAME);
        await CombatSkillCasting.changeSkill(
            combat,
            context.e2eGroup,
            TestAutoRecoveryEnemyEvents.ATTACK_SHORT,
            TestAutoRecoveryEnemyEvents.DIRECT_ATTACK
        );
        return combat;
    }

    static enemiesRecoveryInBattleConfig()
    {
        return Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemyEvents.OBJECTS_PATH),
            {[TestAutoRecoveryEnemyEvents.OBJECTS_PATH+'/onlyOutOfBattle']: true}
        );
    }

    static async fetchEnemyLife(combat)
    {
        return (await GameplayE2eStateApi.fetchEnemyLife(combat.gameConfig, combat.roomName, combat.bodyKey)).life;
    }

    static async setEnemyLife(combat, life)
    {
        let changed = await GameplayE2eStateApi.setEnemyBodyLife(combat.gameConfig, combat.roomName, combat.bodyKey, life);
        expect(changed.life, 'The enemy life must change: '+changed.error).toBe(life);
    }

    static async fetchPlayerLife(gameConfig)
    {
        return (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName)).life;
    }

    static async startBattle(combat)
    {
        let battle = await RoomObjectsApi.startEnemyBattle(
            combat.gameConfig,
            combat.roomName,
            combat.playerName,
            combat.enemyKey
        );
        expect(battle.enemyKey, 'The placed enemy battle must start: '+battle.error).toBe(combat.enemyKey);
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(combat),
            {message: 'The enemy is in battle', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(1);
    }

    static async killPlacedEnemy(page, combat)
    {
        await TestAutoRecoveryEnemyEvents.setEnemyLife(combat, TestAutoRecoveryEnemyEvents.LOW_LIFE);
        await CombatSkillCasting.targetEnemy(page, combat);
        await CombatSkillCasting.castSkill(page, combat, TestAutoRecoveryEnemyEvents.ATTACK_SHORT, 1);
    }

    static async fetchEnemyUpdates(page, bodyKey)
    {
        return (await RoomMessagesRecorder.fetchMessages(page, UsersConst.ACTION_LIFEBAR_UPDATE)).filter(
            message => bodyKey === message[ActionsConst.DATA_OWNER_KEY]
        );
    }

    static async expectEnemyRecoveredAfterBattle(combat, endBattle)
    {
        await TestAutoRecoveryEnemyEvents.startBattle(combat);
        await TestAutoRecoveryEnemyEvents.setEnemyLife(combat, TestAutoRecoveryEnemyEvents.ENEMY_LOWERED_LIFE);
        await endBattle();
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(combat),
            {message: 'The enemy battle ends', timeout: TimeConstants.SCENE_LOAD}
        ).toBe(0);
        let endedAt = Date.now();
        await expect.poll(
            async () => await TestAutoRecoveryEnemyEvents.fetchEnemyLife(combat),
            {
                message: 'The enemy recovers after the battle end',
                timeout: TestAutoRecoveryEnemyEvents.RECOVERY_WAIT_MS,
                intervals: [TestAutoRecoveryEnemyEvents.POLL_MS]
            }
        ).toBeGreaterThan(TestAutoRecoveryEnemyEvents.ENEMY_LOWERED_LIFE);
        expect(Date.now() - endedAt, 'The enemy waits the delay since the battle end').toBeGreaterThanOrEqual(
            AutoRecoverySteps.FAST_START_DELAY_MS - AutoRecoverySteps.FAST_TICK_MS
        );
    }

    static async runKillDelayTest(context)
    {
        let combat = await TestAutoRecoveryEnemyEvents.startCase(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemyEvents.PLAYERS_PATH)
        );
        await AutoRecoverySteps.lowerPlayerLife(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            TestAutoRecoveryEnemyEvents.PLAYER_LIFE
        );
        await TestAutoRecoveryEnemyEvents.startBattle(combat);
        await TestAutoRecoveryEnemyEvents.killPlacedEnemy(context.page, combat);
        let killedAt = Date.now();
        let lifeAtKill = await TestAutoRecoveryEnemyEvents.fetchPlayerLife(context.gameConfig);
        await context.page.waitForTimeout(Math.max(0, killedAt + TestAutoRecoveryEnemyEvents.BEFORE_DELAY_MS - Date.now()));
        expect(
            await TestAutoRecoveryEnemyEvents.fetchPlayerLife(context.gameConfig),
            'The player waits the delay from the kill'
        ).toBe(lifeAtKill);
        await expect.poll(
            async () => await TestAutoRecoveryEnemyEvents.fetchPlayerLife(context.gameConfig),
            {message: 'The player recovers after the delay from the kill', timeout: TestAutoRecoveryEnemyEvents.RECOVERY_WAIT_MS}
        ).toBeGreaterThan(lifeAtKill);
    }

    static async fetchEnemyStats(gameConfig, bodyKey)
    {
        return (await GameplayE2eStateApi.setEnemyStats(gameConfig, Login.FOREST_ROOM_NAME, bodyKey, {})).stats;
    }

    static async runNotLifeStatTest(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemyEvents.OBJECTS_PATH),
            {[TestAutoRecoveryEnemyEvents.OBJECTS_PATH+'/properties']: {[TestAutoRecoveryEnemyEvents.LOWERED_STAT_KEY]: 1}}
        ));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let [bodyKey] = await AutoRecoverySteps.keepPassiveEnemies(context.gameConfig, 1);
        await RoomMessagesRecorder.start(context.page);
        let lowered = await GameplayE2eStateApi.setEnemyStats(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            bodyKey,
            {
                [TestAutoRecoveryEnemyEvents.LOWERED_STAT_KEY]: TestAutoRecoveryEnemyEvents.LOWERED_STAT_VALUE,
                [TestAutoRecoveryEnemyEvents.LIFE_STAT_KEY]: TestAutoRecoveryEnemyEvents.ENEMY_LOWERED_LIFE
            }
        );
        expect(
            lowered.stats[TestAutoRecoveryEnemyEvents.LOWERED_STAT_KEY],
            'The enemy stat must be lowered: '+lowered.error
        ).toBe(TestAutoRecoveryEnemyEvents.LOWERED_STAT_VALUE);
        await expect.poll(
            async () => (await TestAutoRecoveryEnemyEvents.fetchEnemyStats(context.gameConfig, bodyKey))[
                TestAutoRecoveryEnemyEvents.LOWERED_STAT_KEY
            ],
            {message: 'The lowered enemy stat recovers', timeout: TestAutoRecoveryEnemyEvents.RECOVERY_WAIT_MS}
        ).toBeGreaterThan(TestAutoRecoveryEnemyEvents.LOWERED_STAT_VALUE);
        expect(
            (await TestAutoRecoveryEnemyEvents.fetchEnemyStats(context.gameConfig, bodyKey))[
                TestAutoRecoveryEnemyEvents.LIFE_STAT_KEY
            ],
            'The enemy life not in the amounts never recovers'
        ).toBe(TestAutoRecoveryEnemyEvents.ENEMY_LOWERED_LIFE);
        expect(
            await TestAutoRecoveryEnemyEvents.fetchEnemyUpdates(context.page, bodyKey),
            'No life bar update is sent for a stat that is not the life'
        ).toEqual([]);
    }

    static async runRespawnedFullTest(context)
    {
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'respawn',
            {object_id: await E2eSeedAndRestoreApi.fetchRowId(
                context.gameConfig,
                'objects',
                {client_key: context.gameConfig.e2eEnemyKey}
            )},
            {respawn_time: TestAutoRecoveryEnemyEvents.RESPAWN_TIME_MS}
        );
        await GameplayE2eStateApi.disposeRoom(context.gameConfig, Login.FOREST_ROOM_NAME);
        let combat = await TestAutoRecoveryEnemyEvents.startCase(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEnemyEvents.OBJECTS_PATH)
        );
        let totalLife = (await GameplayE2eStateApi.fetchEnemyLife(combat.gameConfig, combat.roomName, combat.bodyKey))
            .totalLife;
        await TestAutoRecoveryEnemyEvents.killPlacedEnemy(context.page, combat);
        await expect.poll(
            async () => await TestAutoRecoveryEnemyEvents.fetchEnemyLife(combat),
            {message: 'The enemy respawns with its full life', timeout: TestAutoRecoveryEnemyEvents.RECOVERY_WAIT_MS}
        ).toBe(totalLife);
        await RoomMessagesRecorder.start(context.page);
        await context.page.waitForTimeout(AutoRecoverySteps.FAST_START_DELAY_MS + 3 * AutoRecoverySteps.FAST_TICK_MS);
        expect(
            await TestAutoRecoveryEnemyEvents.fetchEnemyUpdates(context.page, combat.bodyKey),
            'The respawned enemy at full life sends no recovery update'
        ).toEqual([]);
    }

    static async runBattleEndTest(context, endBattle)
    {
        await TestAutoRecoveryEnemyEvents.expectEnemyRecoveredAfterBattle(
            await TestAutoRecoveryEnemyEvents.startCase(context, TestAutoRecoveryEnemyEvents.enemiesRecoveryInBattleConfig()),
            endBattle
        );
    }

    static async killPlayerInBattle(context)
    {
        await AutoRecoverySteps.lowerPlayerLife(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            TestCombatDeath.LAST_HIT_POINTS
        );
        await TestCombatDeath.waitForPlayerHpCondition(context.page, 'dead', TimeConstants.ENEMY_KILL);
    }

    static run()
    {
        test.describe('Auto Recovery Enemy Events', () => {
            test('player that kills the enemy it fought waits the full delay from the kill', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyEvents.runKillDelayTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy amounts only for a stat that is not the life recover it with no life bar update', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyEvents.runNotLifeStatTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy killed at low life respawns full and sends no recovery update', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyEvents.runRespawnedFullTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy recovers a full delay after its battle player left the game', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyEvents.runBattleEndTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    async () => await page.goto('about:blank')
                );
            });
            test('enemy recovers a full delay after its battle player changed room', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEnemyEvents.runBattleEndTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    async () => await AutoRecoverySteps.moveToTown(page, gameConfig)
                );
            });
            test('enemy recovers a full delay after it killed its battle player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await TestAutoRecoveryEnemyEvents.runBattleEndTest(
                    context,
                    async () => await TestAutoRecoveryEnemyEvents.killPlayerInBattle(context)
                );
            });
        });
    }

}

TestAutoRecoveryEnemyEvents.run();
