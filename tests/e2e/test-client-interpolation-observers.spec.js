/**
 *
 * Reldens - Test Client Interpolation Observers
 *
 * Tests the bullets as another client of the room sees them (exclusive group, the first player shoots or is shot in
 * the forest and the second player, moved from the town to the forest, only records): a bullet shot by the first
 * player at a passive enemy and a bullet shot by the aggressive forest enemy (the sample Tree with the attackBullet
 * skill, the only enemy left active, its aggression turned off for the group before the first player is placed six to
 * four tiles away, so only the battle the test starts shoots) are shown on the observer client, rendering
 * their texture, and every recorded frame follows the interpolation of its entry (InterpolationFramesRecorder); once
 * the bullet ends its sprite is destroyed on the observer and on the first player client. The sample fireball bullet
 * has its own animation with left and right directions, so its sprite renders the texture of the direction it flies
 * to (the shooter is placed in line with the enemy; its animation is never played, ISSUE #345). The town NPC placed
 * next to its original tile and walking back (ObjectInterpolationSteps, driven while the second player is in the town)
 * is recorded on the first player client. The same NPC, its random movement paused, walked with its area grid to a
 * walkable tile of its area before the second player logs in, is created on the joining client on its current body
 * position, and after its next walk both clients show it on its body.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { BulletObserverSetup } = require('./helpers/bullet-observer-setup');
const { MovementScenario } = require('./helpers/movement-scenario');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { ObjectInterpolationSteps } = require('./helpers/object-interpolation-steps');
const { RoomMovementApi } = require('./helpers/room-movement-api');
const { WalkableTileLocator } = require('./helpers/walkable-tile-locator');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClientInterpolationObservers
{

    static BULLET_SKILL_KEY = 'attackBullet';
    static BULLET_TEXTURE_KEY = 'default_bullet';
    static FIREBALL = 'fireball';
    static FIREBALL_BULLET = 'fireball_bullet';
    static ENEMY_SHOT_DISTANCES = [6, 5, 4];
    static NO_AGGRESSION_RADIO = 1;
    static FIRST_WALK_OFFSET = [2, 0];
    static SECOND_WALK_OFFSET = [0, 2];

    static async expectObservedBullet(context, observer, fire, expectedTexture)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(observer.page);
        await InterpolationFramesRecorder.start(observer.page, {bullets: true});
        await fire();
        let isFlightEnded = await InterpolationFramesRecorder.waitForBulletsFlightEnd(
            observer.page,
            TimeConstants.SERVER_RESPONSE
        );
        let summary = InterpolationFramesRecorder.summarize(await InterpolationFramesRecorder.stop(observer.page), 'bullet');
        expect(isFlightEnded, 'The observer client shows a bullet flying and destroys its sprite once it ends').toBe(true);
        expect(
            summary.mismatches,
            'Every observed bullet frame follows the interpolation of its entry: '+sc.toJsonString(summary.mismatches)
        ).toEqual([]);
        expect(pageErrors, 'The observer client never throws while the bullet flies').toEqual([]);
        expect(summary.partialMoving, 'The observed bullet sprite steps toward its flying body').toBeGreaterThan(0);
        expect(summary.renderedTextures, 'The observed bullet sprite renders its texture').toEqual([expectedTexture]);
        await expect.poll(
            async () => context.page.evaluate(() => Object.keys(window.reldens.getFeature('objects').bullets).length),
            {message: 'The first player client destroys the ended bullet sprite', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(0);
    }

    static async runPlayerBulletTest(context)
    {
        let entered = await BulletObserverSetup.enterShooterAndObserver(context, false);
        await TestClientInterpolationObservers.expectObservedBullet(
            context,
            entered.observer,
            async () => context.page.click(
                Selectors.combat.skillButton(TestClientInterpolationObservers.BULLET_SKILL_KEY),
                {force: true}
            ),
            TestClientInterpolationObservers.BULLET_TEXTURE_KEY
        );
    }

    static async runSkillAnimationBulletTest(context)
    {
        let entered = await BulletObserverSetup.enterShooterAndObserver(context, false);
        let placement = entered.placement;
        await TestClientInterpolationObservers.expectObservedBullet(
            context,
            entered.observer,
            async () => context.page.click(
                Selectors.combat.skillButton(TestClientInterpolationObservers.FIREBALL),
                {force: true}
            ),
            TestClientInterpolationObservers.FIREBALL_BULLET+'_'
                +(placement.position.x < placement.objectPosition.x ? GameConst.RIGHT : GameConst.LEFT)
        );
    }

    static async runEnemyBulletTest(context)
    {
        let entered = await BulletObserverSetup.enterShooterAndObserver(context, true, {
            distances: TestClientInterpolationObservers.ENEMY_SHOT_DISTANCES,
            beforePlacement: async (enemy) => GameplayE2eStateApi.changeEnemyBattle(
                context.gameConfig,
                context.e2eGroup,
                Login.FOREST_ROOM_NAME,
                enemy.bodyKey,
                {interactionRadio: TestClientInterpolationObservers.NO_AGGRESSION_RADIO},
                false
            )
        });
        await TestClientInterpolationObservers.expectObservedBullet(context, entered.observer, async () => {
            let battle = await RoomObjectsApi.startEnemyBattle(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                context.gameConfig.e2ePlayerName,
                entered.enemy.key
            );
            expect(battle.enemyKey, 'The aggressive enemy starts its battle: '+battle.error).toBeTruthy();
        }, TestClientInterpolationObservers.BULLET_TEXTURE_KEY);
    }

    static async runObjectObserverTest(context)
    {
        let walkContext = await MovementScenario.start(context.page, context.gameConfig, context.longRun);
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(context.secondPage);
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun);
        let npc = await walkContext.fetchNpc();
        expect(npc, 'The e2eNpcKey object must be in the town room').toBeTruthy();
        expect(
            await InterpolationFramesRecorder.waitForObjectOnBody(
                context.secondPage,
                walkContext.npcKey,
                false,
                walkContext.navTimeout
            ),
            'The observer client shows the NPC on its stopped body before the recording'
        ).toBe(true);
        ObjectInterpolationSteps.expectRecording(
            await ObjectInterpolationSteps.recordPlacementAndWalkBack(
                context.page,
                context.secondPage,
                walkContext,
                npc,
                context.longRun
            ),
            pageErrors
        );
    }

    static async walkNpc(context, npcKey, tile)
    {
        expect(tile, 'The walk target must be a walkable tile of the NPC area').toBeTruthy();
        await RoomMovementApi.moveObject(context.gameConfig, Login.TOWN_ROOM_NAME, npcKey, tile, true);
        await expect.poll(
            async () => (({currentCol, currentRow, pathSteps}) => [currentCol, currentRow, pathSteps])(
                await RoomMovementApi.fetchObject(context.gameConfig, Login.TOWN_ROOM_NAME, npcKey)
            ),
            {message: 'The NPC walks to its target tile', timeout: TimeConstants.SCENE_LOAD}
        ).toEqual([tile[0], tile[1], 0]);
    }

    static async runLateJoinTest(context)
    {
        let walkContext = await MovementScenario.start(context.page, context.gameConfig, context.longRun);
        let npc = await RoomMovementApi.switchRandomMovement(context.gameConfig, Login.TOWN_ROOM_NAME, walkContext.npcKey, false);
        expect(npc, 'The e2eNpcKey object random movement is paused').toBeTruthy();
        let origin = [npc.originalCol, npc.originalRow];
        let tiles = await RoomMovementApi.fetchTiles(context.gameConfig, Login.TOWN_ROOM_NAME, origin, npc.maxTiles);
        await TestClientInterpolationObservers.walkNpc(
            context,
            walkContext.npcKey,
            WalkableTileLocator.findWalkableNearOffset(tiles, origin, TestClientInterpolationObservers.FIRST_WALK_OFFSET)
        );
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun);
        expect(
            await InterpolationFramesRecorder.waitForObjectOnBody(context.secondPage, walkContext.npcKey, false, walkContext.navTimeout),
            'The joining client creates the NPC sprite on its current body position'
        ).toBe(true);
        await TestClientInterpolationObservers.walkNpc(
            context,
            walkContext.npcKey,
            WalkableTileLocator.findWalkableNearOffset(tiles, origin, TestClientInterpolationObservers.SECOND_WALK_OFFSET)
        );
        for(let observerPage of [context.page, context.secondPage]){
            expect(
                await InterpolationFramesRecorder.waitForObjectOnBody(observerPage, walkContext.npcKey, false, walkContext.navTimeout),
                'Every client shows the NPC on its body after its next walk'
            ).toBe(true);
        }
    }

    static run()
    {
        test.describe('Client Interpolation Observers', () => {
            test('a client joining after the NPC walked creates it on its body and both clients follow its next walk', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationObservers.runLateJoinTest({page, secondPage, gameConfig, longRun});
            });
            test('a bullet shot by another player is shown and interpolated on the observer client and destroyed on both', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationObservers.runPlayerBulletTest({page, secondPage, gameConfig, longRun});
            });
            test('an object placement and walk back are shown and interpolated on another client of the room', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationObservers.runObjectObserverTest({page, secondPage, gameConfig, longRun});
            });
            test('a bullet with its own directional skill animation shows the texture of its flight direction', async ({ page, secondPage, gameConfig, longRun }) => {
                await TestClientInterpolationObservers.runSkillAnimationBulletTest({page, secondPage, gameConfig, longRun});
            });
            test('a bullet shot by an enemy is shown and interpolated on the observer client and destroyed on both', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestClientInterpolationObservers.runEnemyBulletTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClientInterpolationObservers.run();
