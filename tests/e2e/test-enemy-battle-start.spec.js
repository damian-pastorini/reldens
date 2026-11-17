/**
 *
 * Reldens - Test Enemy Battle Start
 *
 * Tests how a placed forest enemy starts a battle without a player attack (CombatSkillCasting places it next to the
 * player with its aggression held and disables every other enemy): the aggressive enemy starts it only when the player
 * stands on a tile of the enemy respawn layer inside its stored "interactionRadio" (a player outside the radio or
 * inside it on a tile out of the respawn layer is ignored), placed on the server by RoomAggressionPlacement, which
 * releases the held aggression; the out of the layer check runs where the forest players start, away from the respawn
 * areas, and the radio checks run after the player is moved to the densest tile of the enemy respawn layer and the
 * enemy is held next to it there again. A player walking on a clear line into the enemy starts it by the collision, and the enemy with
 * "startBattleOnHit" off ignores that collision; in both the enemy "interactionRadio" is 1 pixel, so its aggression
 * never starts it, and the enemy properties are restored by the group reset.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { EnemyAggressionSteps } = require('./helpers/enemy-aggression-steps');
const { Navigation } = require('./helpers/navigation');
const { Phaser } = require('./helpers/phaser');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestEnemyBattleStart
{

    static WALK_MS = 1500;
    static NO_AGGRESSION_RADIO = 1;
    static NEAR_TILES = 2;
    static FAR_TILES = 4;
    static WALK_TILES = [2, 3];
    static TOUCHING_TILES = 1.5;

    static async walkIntoEnemy(page, gameConfig, e2eGroup, longRun, enemyProperties)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await GameplayE2eStateApi.changeEnemyBattle(gameConfig, e2eGroup, context.roomName, context.bodyKey, {
            interactionRadio: TestEnemyBattleStart.NO_AGGRESSION_RADIO,
            ...enemyProperties
        }, false);
        await EnemyAggressionSteps.placeForAggression(page, context, {
            minimumDistance: TestEnemyBattleStart.NEAR_TILES * Navigation.TILE_SIZE,
            maximumDistance: TestEnemyBattleStart.FAR_TILES * Navigation.TILE_SIZE,
            isRespawnTile: null
        }, 'The held aggression must be released');
        await EnemyAggressionSteps.expectNoBattle(page, context, 'A 1 pixel radio never starts the aggression');
        let lined = await CombatSkillCasting.placeByEnemy(
            page,
            context,
            RoomObjectsApi.placePlayerInLineOfObject,
            TestEnemyBattleStart.WALK_TILES,
            'The player must be placed on a clear line to the enemy'
        );
        await Navigation.walkTowardWorldPoint(
            page,
            lined.objectPosition.x,
            lined.objectPosition.y,
            TestEnemyBattleStart.WALK_MS
        );
        return {context, enemyPosition: lined.objectPosition};
    }

    static async runAggressionIgnoredTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let interactionRadio = EnemyAggressionSteps.loadInteractionRadio(gameConfig);
        expect(interactionRadio, 'The forest enemy must have an interaction radio').toBeGreaterThan(0);
        let outsideArea = await EnemyAggressionSteps.placeForAggression(page, context, {
            minimumDistance: TestEnemyBattleStart.NEAR_TILES * Navigation.TILE_SIZE,
            maximumDistance: interactionRadio - Navigation.TILE_SIZE,
            isRespawnTile: false
        }, 'The player must stand inside the radio out of the respawn area');
        expect(outsideArea.distance).toBeLessThan(interactionRadio);
        await EnemyAggressionSteps.expectNoBattle(page, context, 'Out of the respawn area the enemy ignores the player');
        await EnemyAggressionSteps.moveToRespawnArea(page, context, interactionRadio);
        let outsideRadio = await EnemyAggressionSteps.placeForAggression(page, context, {
            minimumDistance: interactionRadio + Navigation.TILE_SIZE,
            maximumDistance: interactionRadio + TestEnemyBattleStart.FAR_TILES * Navigation.TILE_SIZE,
            isRespawnTile: true
        }, 'The player must stand on the respawn area outside the radio');
        expect(outsideRadio.distance).toBeGreaterThan(interactionRadio);
        await EnemyAggressionSteps.expectNoBattle(page, context, 'Outside the radio the enemy ignores the player');
        await screenshots.capture(page, 'aggression-ignored');
    }

    static async runAggressionStartTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let interactionRadio = EnemyAggressionSteps.loadInteractionRadio(gameConfig);
        await EnemyAggressionSteps.moveToRespawnArea(page, context, interactionRadio);
        let insideRadio = await EnemyAggressionSteps.placeForAggression(page, context, {
            minimumDistance: TestEnemyBattleStart.NEAR_TILES * Navigation.TILE_SIZE,
            maximumDistance: interactionRadio - Navigation.TILE_SIZE,
            isRespawnTile: true
        }, 'The player must stand on the respawn area inside the radio');
        expect(insideRadio.distance).toBeLessThan(interactionRadio);
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(context),
            {message: 'The aggressive enemy starts the battle', timeout: context.timeout}
        ).toBe(1);
        await screenshots.capture(page, 'aggression-started');
    }

    static async runCollisionStartTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let walked = await TestEnemyBattleStart.walkIntoEnemy(page, gameConfig, e2eGroup, longRun, {});
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(walked.context),
            {message: 'The collision starts the battle', timeout: walked.context.timeout}
        ).toBe(1);
        await screenshots.capture(page, 'collision-started');
    }

    static async runCollisionIgnoredTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let walked = await TestEnemyBattleStart.walkIntoEnemy(page, gameConfig, e2eGroup, longRun, {
            startBattleOnHit: false
        });
        let playerPosition = await Phaser.getPlayerServerPosition(page);
        expect(
            Math.hypot(playerPosition.x - walked.enemyPosition.x, playerPosition.y - walked.enemyPosition.y),
            'The enemy body must stop the player walk'
        ).toBeLessThan(TestEnemyBattleStart.TOUCHING_TILES * Navigation.TILE_SIZE);
        await EnemyAggressionSteps.expectNoBattle(page, walked.context, 'startBattleOnHit off ignores the collision');
        await screenshots.capture(page, 'collision-ignored');
    }

    static run()
    {
        test.describe('Enemy Battle Start', () => {
            test('aggressive enemy ignores a player outside its interaction radio or its respawn area', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleStart.runAggressionIgnoredTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('aggressive enemy starts the battle with a player on its respawn area inside its interaction radio', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleStart.runAggressionStartTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy starts the battle when a player walks into it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleStart.runCollisionStartTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy with startBattleOnHit off ignores a player walking into it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleStart.runCollisionIgnoredTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestEnemyBattleStart.run();
