/**
 *
 * Reldens - Test Enemy Chase Time Outs
 *
 * Tests when a chasing enemy gives up the battle: the configured forest enemy is placed next to the player and the
 * player stands on its respawn layer out of its skill range (EnemyAggressionSteps), the enemy movement speed is set to 0
 * for the group, so its chase keeps a path but never reaches the player and never hits it, and its battle is started:
 * with the chase time out of 0 for the group the enemy never gives up; with a 3 seconds chase time out a player hit on
 * the chasing enemy restarts it while a hit of the
 * second player on that busy enemy does not; and the enemy that left the battle walks back to its origin once it can
 * move again. The enemy private params seeded on its stored row (the forest room disposed before the login, so it is
 * created again with them, and disposed again at the end, so the next test gets the restored row) override the config:
 * its chaseTimeOut makes the enemy leave the battle with the config chase time out at 0, and its chaseMultiple adds the
 * second player to the battle of the enemy busy with the first one. The player hits use the attack skill with its range
 * check off for the group, so they land from out of range.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { EnemyAggressionSteps } = require('./helpers/enemy-aggression-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestEnemyChaseTimeOuts
{

    static CHASE_TIME_OUT_MS = 3000;
    static POLL_MS = 100;
    static HIT_AFTER_START_MS = 1500;
    static CHECK_MARGIN_MS = 500;
    static SPEED_PROPERTY = 'movementSpeed';
    static WALK_SPEED = 90;
    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};

    static async overrideChaseTimeOut(context, chaseTimeOut)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            context.gameConfig,
            context.e2eGroup,
            ActionsConst.PVE.CONFIG_PATHS.CHASE_TIME_OUT,
            chaseTimeOut
        );
    }

    static async setEnemySpeed(context, combat, speed)
    {
        let enemyKey = (await CombatSkillCasting.fetchEnemySnapshot(combat)).key;
        let changed = await GameplayE2eStateApi.changeBodyProperty(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            enemyKey,
            TestEnemyChaseTimeOuts.SPEED_PROPERTY,
            speed
        );
        expect(changed.value, 'The enemy speed must change: '+changed.error).toBe(speed);
    }

    static async startFrozenChase(context)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + 4 * TimeConstants.SCENE_LOAD
        );
        let combat = (await EnemyAggressionSteps.prepareChase(context.page, context.gameConfig, context.longRun)).context;
        await TestEnemyChaseTimeOuts.setEnemySpeed(context, combat, 0);
        await EnemyAggressionSteps.startEnemyBattle(combat);
        let startedAt = Date.now();
        expect(await CombatSkillCasting.fetchEnemyInBattle(combat), 'The enemy chases the player').toBe(1);
        return {combat, startedAt};
    }

    static async expectBattleLeft(combat, timeout, message)
    {
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(combat),
            {message, timeout, intervals: [TestEnemyChaseTimeOuts.POLL_MS]}
        ).toBe(0);
    }

    static async hitEnemy(page, combat, group)
    {
        await GameplayE2eStateApi.recordPlayerSkills(combat.gameConfig, combat.roomName, combat.playerName);
        await CombatSkillCasting.changeSkill(
            combat,
            group,
            TestEnemyChaseTimeOuts.ATTACK_SHORT,
            TestEnemyChaseTimeOuts.DIRECT_ATTACK
        );
        await CombatSkillCasting.targetEnemy(page, combat);
        await CombatSkillCasting.castSkill(page, combat, TestEnemyChaseTimeOuts.ATTACK_SHORT, 1);
    }

    static async waitUntil(page, time)
    {
        await page.waitForTimeout(Math.max(0, time - Date.now()));
    }

    static async runNoChaseTimeOutTest(context)
    {
        await TestEnemyChaseTimeOuts.overrideChaseTimeOut(context, 0);
        let chase = await TestEnemyChaseTimeOuts.startFrozenChase(context);
        await TestEnemyChaseTimeOuts.waitUntil(context.page, chase.startedAt + 2 * TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS);
        expect(
            await CombatSkillCasting.fetchEnemyInBattle(chase.combat),
            'With the chase time out 0 the enemy never gives up'
        ).toBe(1);
    }

    static async runPlayerHitRestartTest(context)
    {
        await TestEnemyChaseTimeOuts.overrideChaseTimeOut(context, TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS);
        let chase = await TestEnemyChaseTimeOuts.startFrozenChase(context);
        await TestEnemyChaseTimeOuts.waitUntil(context.page, chase.startedAt + TestEnemyChaseTimeOuts.HIT_AFTER_START_MS);
        await TestEnemyChaseTimeOuts.hitEnemy(context.page, chase.combat, context.e2eGroup);
        let hitAt = Date.now();
        await TestEnemyChaseTimeOuts.waitUntil(
            context.page,
            chase.startedAt + TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS + TestEnemyChaseTimeOuts.CHECK_MARGIN_MS
        );
        expect(
            await CombatSkillCasting.fetchEnemyInBattle(chase.combat),
            'The player hit during the chase restarts the chase time out'
        ).toBe(1);
        await TestEnemyChaseTimeOuts.expectBattleLeft(
            chase.combat,
            Math.max(0, hitAt + TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS - Date.now()) + TimeConstants.SERVER_RESPONSE,
            'The enemy leaves once the restarted chase time out passed'
        );
    }

    static async runBusyEnemyHitTest(context)
    {
        await TestEnemyChaseTimeOuts.overrideChaseTimeOut(context, TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS);
        let secondConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondConfig, context.longRun);
        let chase = await TestEnemyChaseTimeOuts.startFrozenChase(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        await TestEnemyChaseTimeOuts.waitUntil(context.page, chase.startedAt + TestEnemyChaseTimeOuts.HIT_AFTER_START_MS);
        await TestEnemyChaseTimeOuts.hitEnemy(
            context.secondPage,
            Object.assign({}, chase.combat, {gameConfig: secondConfig, playerName: secondConfig.e2ePlayerName}),
            context.e2eGroup
        );
        let hitAt = Date.now();
        await TestEnemyChaseTimeOuts.expectBattleLeft(
            chase.combat,
            Math.max(0, hitAt + TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS - Date.now()),
            'The hit of the second player on the busy enemy does not restart the first player chase time out'
        );
    }

    static async disposeForest(context)
    {
        let disposed = await GameplayE2eStateApi.disposeRoom(context.gameConfig, Login.FOREST_ROOM_NAME);
        expect(
            [Login.FOREST_ROOM_NAME, 'Room '+Login.FOREST_ROOM_NAME+' not found.'],
            'The forest room is disposed or not created yet'
        ).toContain(disposed.disposed || disposed.error);
    }

    static async seedEnemyPrivateParams(context, privateParams)
    {
        let gameConfig = context.gameConfig;
        let enemyFilters = {client_key: gameConfig.e2eEnemyKey};
        let enemyRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', enemyFilters)].shift();
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'objects', enemyFilters, {
            private_params: sc.toJsonString(Object.assign(sc.toJson(enemyRow.private_params, {}), privateParams))
        });
        await TestEnemyChaseTimeOuts.disposeForest(context);
    }

    static async leaveAndDisposeForest(context, pages)
    {
        for(let page of pages){
            await page.goto('about:blank');
        }
        await TestEnemyChaseTimeOuts.disposeForest(context);
    }

    static async runPrivateChaseTimeOutTest(context)
    {
        await TestEnemyChaseTimeOuts.overrideChaseTimeOut(context, 0);
        await TestEnemyChaseTimeOuts.seedEnemyPrivateParams(context, {
            chaseTimeOut: TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS
        });
        let chase = await TestEnemyChaseTimeOuts.startFrozenChase(context);
        await TestEnemyChaseTimeOuts.expectBattleLeft(
            chase.combat,
            TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS + TimeConstants.SERVER_RESPONSE,
            'The enemy private chase time out overrides the config 0, so the enemy leaves the battle'
        );
        await TestEnemyChaseTimeOuts.leaveAndDisposeForest(context, [context.page]);
    }

    static async runPrivateChaseMultipleTest(context)
    {
        await TestEnemyChaseTimeOuts.overrideChaseTimeOut(context, 0);
        await TestEnemyChaseTimeOuts.seedEnemyPrivateParams(context, {chaseMultiple: true});
        let secondConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondConfig, context.longRun);
        let chase = await TestEnemyChaseTimeOuts.startFrozenChase(context);
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let placed = await RoomObjectsApi.placePlayerNextToObject(
            context.secondPage,
            secondConfig,
            Login.FOREST_ROOM_NAME,
            chase.combat.enemyKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placed.reached, 'The second player is placed next to the frozen enemy').toBe(true);
        let secondBattle = await RoomObjectsApi.startEnemyBattle(
            context.gameConfig,
            chase.combat.roomName,
            secondConfig.e2ePlayerName,
            chase.combat.enemyKey
        );
        expect(secondBattle.enemyKey, 'The second player battle start must reach the enemy: '+secondBattle.error).toBe(
            chase.combat.enemyKey
        );
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(chase.combat),
            {message: 'With the private chaseMultiple the enemy battle holds both players', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(2);
        await TestEnemyChaseTimeOuts.leaveAndDisposeForest(context, [context.page, context.secondPage]);
    }

    static async runBackToOriginTest(context)
    {
        await TestEnemyChaseTimeOuts.overrideChaseTimeOut(context, TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS);
        let chase = await TestEnemyChaseTimeOuts.startFrozenChase(context);
        await TestEnemyChaseTimeOuts.expectBattleLeft(
            chase.combat,
            TestEnemyChaseTimeOuts.CHASE_TIME_OUT_MS + TimeConstants.SERVER_RESPONSE,
            'The enemy leaves the battle once the chase time out passed'
        );
        await TestEnemyChaseTimeOuts.setEnemySpeed(context, chase.combat, TestEnemyChaseTimeOuts.WALK_SPEED);
        await EnemyAggressionSteps.expectBackToOrigin(chase.combat, 'The enemy is out of the battle');
    }

    static run()
    {
        test.describe('Enemy Chase Time Outs', () => {
            test('chase time out 0 keeps the enemy chasing the player out of reach', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyChaseTimeOuts.runNoChaseTimeOutTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player hit during the chase restarts the chase time out', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyChaseTimeOuts.runPlayerHitRestartTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player hit on the busy enemy does not restart the first player chase time out', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyChaseTimeOuts.runBusyEnemyHitTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('enemy that left the battle walks back to its origin', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyChaseTimeOuts.runBackToOriginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy private param chaseTimeOut overrides the config chase time out', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyChaseTimeOuts.runPrivateChaseTimeOutTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy private param chaseMultiple adds the second player to its battle', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyChaseTimeOuts.runPrivateChaseMultipleTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestEnemyChaseTimeOuts.run();
