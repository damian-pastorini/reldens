/**
 *
 * Reldens - Test Enemy Respawn
 *
 * Tests the respawn of the placed forest enemy killed by the player (CombatSkillCasting): with its live respawn time at
 * 0 (the respawnTime of the live object, read on every death, changed for the group) the enemy gets its full life and
 * the active state again right after its death, well before the seeded respawn time; and a player that disconnects
 * while the enemy it killed is respawning does not stop the restoration, the enemy gets its full life and the active
 * state once its respawn time ends (a second player keeps the room created).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { NpcDialogSteps } = require('./helpers/npc-dialog-steps');
const { TimeConstants } = require('./helpers/time-constants');
const { Login } = require('./helpers/login');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestEnemyRespawn
{

    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static LAST_LIFE_POINTS = 1;
    static INSTANT_RESTORE_MS = 1500;
    static SHORT_RESPAWN_MS = 3000;

    static async killPlacedEnemy(page, gameConfig, e2eGroup, longRun, respawnTime)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestEnemyRespawn.ATTACK_SHORT, TestEnemyRespawn.DIRECT_ATTACK);
        await NpcDialogSteps.changeObjectProperty(
            {gameConfig, e2eGroup},
            context.roomName,
            context.enemyKey,
            'respawnTime',
            respawnTime
        );
        context.totalLife = (await GameplayE2eStateApi.fetchEnemyLife(gameConfig, context.roomName, context.bodyKey)).totalLife;
        await GameplayE2eStateApi.setEnemyBodyLife(gameConfig, context.roomName, context.bodyKey, TestEnemyRespawn.LAST_LIFE_POINTS);
        let killingHit = await CombatSkillCasting.castSkill(page, context, TestEnemyRespawn.ATTACK_SHORT, 1);
        expect(killingHit.newValue, 'The hit kills the enemy').toBe(0);
        return context;
    }

    static async expectRestored(context, timeout, message)
    {
        await expect.poll(
            async () => [
                await CombatSkillCasting.fetchEnemyLife(context),
                (await CombatSkillCasting.fetchEnemySnapshot(context)).inState
            ],
            {message, timeout}
        ).toEqual([context.totalLife, GameConst.STATUS.ACTIVE]);
    }

    static async runInstantRespawnTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let enemyObjectId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'objects', {client_key: gameConfig.e2eEnemyKey});
        let seededRespawn = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'respawn', {object_id: enemyObjectId})].shift();
        expect(Number(seededRespawn.respawn_time), 'The seeded respawn time is longer than the instant restore').toBeGreaterThan(
            TestEnemyRespawn.INSTANT_RESTORE_MS
        );
        let context = await TestEnemyRespawn.killPlacedEnemy(page, gameConfig, e2eGroup, longRun, 0);
        await TestEnemyRespawn.expectRestored(
            context,
            TestEnemyRespawn.INSTANT_RESTORE_MS,
            'The enemy with the respawn time at 0 restores at once'
        );
        await screenshots.capture(page, 'enemy-instant-respawn');
    }

    static async runDisconnectDuringRespawnTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let context = await TestEnemyRespawn.killPlacedEnemy(
            page,
            gameConfig,
            e2eGroup,
            longRun,
            TestEnemyRespawn.SHORT_RESPAWN_MS
        );
        await page.close();
        expect(
            (await CombatSkillCasting.fetchEnemySnapshot(context)).inState,
            'The enemy is still respawning when its killer leaves'
        ).not.toBe(GameConst.STATUS.ACTIVE);
        await TestEnemyRespawn.expectRestored(
            context,
            TestEnemyRespawn.SHORT_RESPAWN_MS + TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun),
            'The respawn completes after its killer left'
        );
        await screenshots.capture(secondPage, 'enemy-respawn-after-killer-left');
    }

    static run()
    {
        test.describe('Enemy Respawn', () => {
            test('enemy with the respawn time at 0 restores right after its death', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyRespawn.runInstantRespawnTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy respawn completes after the player that killed it disconnects', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyRespawn.runDisconnectDuringRespawnTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestEnemyRespawn.run();
