/**
 *
 * Reldens - Test Death Revived Body
 *
 * Tests the body of a player revived in place (the death teleport is off; CombatSkillCasting enters the forest with the
 * configured enemy placed next to the player, every other enemy disabled and the player skills recorded, and that enemy
 * kills the player with a real hit): after the revive the player body is back in the room physics world (so it
 * collides again), the player walks with a tap move two tiles away, and its attack skill hits the enemy again (the
 * attack range check is off for the group). Another player placed next to the player before its death walks with a
 * pointer move onto the dead player tile without colliding (the dead body is out of the world) and, once the player
 * revived in place, the same pointer move collides with it before its tile.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Navigation } = require('./helpers/navigation');
const { TeamSteps } = require('./helpers/team-steps');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameConst } = require('../../lib/game/constants');
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
    static WALKER_SUFFIX = '2';

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
            async () => [await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)].map(
                (walkedPlayer) => [walkedPlayer.x, walkedPlayer.y]
            ).pop(),
            {message: 'The revived player walks', timeout: TimeConstants.SERVER_RESPONSE}
        ).not.toEqual([revivedPlayer.x, revivedPlayer.y]);
        await CombatSkillCasting.targetEnemy(context.page, combat);
        let hit = await CombatSkillCasting.castSkill(context.page, combat, TestDeathRevivedBody.ATTACK_SHORT, 1);
        expect(hit, 'The revived player attack hits the enemy').toBeTruthy();
    }

    static async walkIntoTarget(context, walker, startPosition, targetTile, targetContact)
    {
        await RoomMovementApi.placePlayer(context.gameConfig, Login.FOREST_ROOM_NAME, walker.playerName, startPosition);
        await RoomMessagesRecorder.sendMessage(walker.page, {
            act: GameConst.POINTER,
            column: targetTile[0],
            row: targetTile[1]
        });
        let walk = await RoomMovementApi.collectTrail(
            async () => RoomMovementApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, walker.playerName),
            (snapshot) => snapshot.contacts.includes(targetContact)
                || (targetTile[0] === snapshot.currentCol && targetTile[1] === snapshot.currentRow),
            TimeConstants.SERVER_RESPONSE
        );
        await RoomMovementApi.placePlayer(context.gameConfig, Login.FOREST_ROOM_NAME, walker.playerName, startPosition);
        return walk.last;
    }

    static async runOtherPlayerBodyTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, TestDeathRevivedBody.TELEPORT_OFF);
        let combat = await CombatSkillCasting.prepareEnemyTarget(context.page, context.gameConfig, context.longRun);
        let walker = {page: context.secondPage, playerName: context.gameConfig.e2ePlayerName2};
        await Login.loginRootPlayer(walker.page, context.gameConfig, context.longRun, TestDeathRevivedBody.WALKER_SUFFIX);
        await TeamSteps.changeScene(context, walker, Login.TOWN_ROOM_NAME, Login.FOREST_ROOM_NAME);
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            walker.playerName,
            combat.playerName
        );
        expect(placed.position, 'The walker is placed next to the player: '+placed.error).toBeTruthy();
        let alive = await RoomMovementApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, combat.playerName);
        await TestCombatDeath.killPlayerWithEnemyAttack(context.page, context.gameConfig, combat.enemyKey, TimeConstants.ENEMY_KILL);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME, true);
        let deadContact = 'player:'+(await context.page.evaluate(() => window.reldens.activeRoomEvents.room.sessionId));
        let dead = await RoomMovementApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, combat.playerName);
        expect([dead.x, dead.y], 'The dead body stays where the player died').toEqual([alive.x, alive.y]);
        let deadTile = [alive.currentCol, alive.currentRow];
        expect((await DeathReviveSteps.fetchPlayer(context, Login.FOREST_ROOM_NAME)).bodyInWorld, 'The dead body is removed')
            .toBe(false);
        let throughDead = await TestDeathRevivedBody.walkIntoTarget(context, walker, placed.position, deadTile, deadContact);
        expect(
            [throughDead.currentCol, throughDead.currentRow, throughDead.contacts.includes(deadContact)],
            'The other player walks onto the dead player tile without colliding'
        ).toEqual([deadTile[0], deadTile[1], false]);
        expect((await DeathReviveSteps.expectAliveInForest(context)).bodyInWorld, 'The revived body is back').toBe(true);
        let intoRevived = await TestDeathRevivedBody.walkIntoTarget(context, walker, placed.position, deadTile, deadContact);
        expect(
            [intoRevived.contacts.includes(deadContact), intoRevived.currentCol+','+intoRevived.currentRow === deadTile.join(',')],
            'The other player collides with the revived player before its tile'
        ).toEqual([true, false]);
    }

    static run()
    {
        test.describe('Death Revived Body', () => {
            test('another player walks through the dead player body and collides with it once revived', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathRevivedBody.runOtherPlayerBodyTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player revived in place walks, collides and casts its skills again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestDeathRevivedBody.runRevivedBodyTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestDeathRevivedBody.run();
