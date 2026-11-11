/**
 *
 * Reldens - Test Death Revived Body
 *
 * Tests the body of a player revived in place (the death teleport is off; CombatSkillCasting enters the forest with the
 * configured enemy placed next to the player, every other enemy disabled and the player skills recorded, and that enemy
 * kills the player with a real hit): after the revive the player body is back in the room physics world (so it
 * collides again), the player walks with a tap move two tiles away, and its attack skill hits the enemy again (the
 * attack range check is off for the group).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestDeathRevivedBody
{

    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static WALK_TILES = 2;

    static async runRevivedBodyTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, TestDeathRevivedBody.TELEPORT_OFF);
        let combat = await CombatSkillCasting.prepareEnemyTarget(context.page, context.gameConfig, context.longRun);
        await CombatSkillCasting.changeSkill(
            combat,
            context.e2eGroup,
            TestDeathRevivedBody.ATTACK_SHORT,
            TestDeathRevivedBody.DIRECT_ATTACK
        );
        await TestCombatDeath.killPlayerWithEnemyAttack(
            context.page,
            context.gameConfig,
            combat.enemyKey,
            TimeConstants.ENEMY_KILL
        );
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        expect(revivedPlayer.bodyInWorld, 'The revived player body is back in the room physics world').toBe(true);
        await Navigation.moveToWorldPoint(
            context.page,
            revivedPlayer.x + TestDeathRevivedBody.WALK_TILES * Navigation.TILE_SIZE,
            revivedPlayer.y
        );
        await expect.poll(
            async () => {
                let walkedPlayer = await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME);
                return [walkedPlayer.x, walkedPlayer.y];
            },
            {message: 'The revived player walks', timeout: TimeConstants.SERVER_RESPONSE}
        ).not.toEqual([revivedPlayer.x, revivedPlayer.y]);
        await CombatSkillCasting.targetEnemy(context.page, combat);
        let hit = await CombatSkillCasting.castSkill(context.page, combat, TestDeathRevivedBody.ATTACK_SHORT, 1);
        expect(hit, 'The revived player attack hits the enemy').toBeTruthy();
    }

    static run()
    {
        test.describe('Death Revived Body', () => {
            test('player revived in place walks, collides and casts its skills again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathRevivedBody.runRevivedBodyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathRevivedBody.run();
