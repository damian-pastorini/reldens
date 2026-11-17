/**
 *
 * Reldens - Test Enemy Battle Scene Change
 *
 * Tests the forest enemy battle of a player that changes scene while the enemy chases it (EnemyAggressionSteps): the
 * player placed on the forest change point to the town (RoomChangePointPlacement) reaches the town, then the enemy
 * leaves the battle and walks back to its origin. It runs in the exclusive group, after every other group ended,
 * because the player ends in the town.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { EnemyAggressionSteps } = require('./helpers/enemy-aggression-steps');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestEnemyBattleSceneChange
{

    static async runSceneChangeTest(page, screenshots, gameConfig, longRun)
    {
        let context = await EnemyAggressionSteps.startChase(page, gameConfig, longRun);
        await screenshots.capture(page, 'enemy-chasing-before-scene-change');
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            page,
            gameConfig,
            context.roomName,
            Login.TOWN_ROOM_NAME
        );
        expect(placed.position, 'The player must be placed on the change point to the town: '+placed.error).toBeTruthy();
        await Navigation.waitForRoom(page, Login.TOWN_ROOM_NAME, context.timeout);
        expect(await Navigation.getCurrentRoomName(page), 'The player reaches the town').toBe(Login.TOWN_ROOM_NAME);
        await EnemyAggressionSteps.expectBackToOrigin(context, 'The enemy leaves the battle of the player that left');
        await screenshots.capture(page, 'player-in-town-after-scene-change');
    }

    static run()
    {
        test.describe('Enemy Battle Scene Change', () => {
            test('enemy leaves the battle and walks back to its origin when its player changes scene', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestEnemyBattleSceneChange.runSceneChangeTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestEnemyBattleSceneChange.run();
