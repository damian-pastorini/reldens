/**
 *
 * Reldens - Test Combat Bullet Obstacle Hits
 *
 * Tests where a fireball bullet ends in the forest (CombatSkillCasting): with a second forest enemy placed between the
 * player and the targeted enemy (RoomLinePlacement, both enemies placed again without the held aggression and with
 * their aggression off by a 1 pixel "interactionRadio", and every enemy action with an unlimited range for the group,
 * so a started battle always attacks instead of a chase that fails and leaves it), the bullet hits the enemy in
 * between (the hit is broadcast on its position); with "validateTargetOnHit" off that enemy starts its own battle with
 * the player and takes the damage while the selected target behind it keeps its life (ISSUE #42), and with it on the hit
 * applies no damage and only the target battle is started, the enemy in between stays out of battle and both enemies
 * keep their life. The line goes to the left of the player, so the bullet flies to the left and the enemy in between
 * is the first body of the hit (the physics broadphase sorts the bodies by their left bound); with the line to the right
 * the bullet is the first body and the enemy in between is still the defender that takes the damage and starts its
 * battle (ISSUE #179). A fireball shot while a forest mining rock (a room object without stats) is placed in between
 * ends on the rock: it is shot once, no hit is broadcast, nothing is damaged, the target keeps its life and the server
 * keeps running with the rock unchanged (ISSUE #464: the hit read the missing stats and the server shut down). A
 * fireball shot at a player standing behind a wall (the two players at both sides of a wall tile) ends on the wall: no
 * damage, no hit and the target keeps its life, the bullet sprite flies and is destroyed and the bullet body is removed
 * from the room state.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { EnemyAggressionSteps } = require('./helpers/enemy-aggression-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Login } = require('./helpers/login');
const { Navigation } = require('./helpers/navigation');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatBulletObstacleHits
{

    static FIREBALL = 'fireball';
    static NO_AGGRESSION_RADIO = 1;
    static LINE_TILES_STEP = 2;
    static LINE_DIRECTION = [-1, 0];
    static RIGHT_LINE_DIRECTION = [1, 0];
    static UNLIMITED_RANGE = 0;
    static QUIET_MS = 1500;

    static async prepareFireball(context, e2eGroup, properties)
    {
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestCombatBulletObstacleHits.FIREBALL, Object.assign(
            {criticalChance: 0},
            properties
        ));
        let caster = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, context.roomName, context.playerName);
        await CombatSkillCasting.setPlayerStats(context, {mp: caster.statsBase.mp});
    }

    static async placeWithoutHold(page, context, e2eGroup)
    {
        await GameplayE2eStateApi.changeEnemyBattle(context.gameConfig, e2eGroup, context.roomName, context.bodyKey, {
            interactionRadio: TestCombatBulletObstacleHits.NO_AGGRESSION_RADIO
        }, false);
        await EnemyAggressionSteps.placeEnemyNextToPlayer(page, context, false);
    }

    static async prepareEnemyInBetween(page, gameConfig, e2eGroup, longRun, shot)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let blocker = (await RoomObjectsApi.fetchRoomObjects(gameConfig, context.roomName)).find(
            roomObject => gameConfig.e2eEnemyKey === roomObject.assetKey && context.enemyKey !== roomObject.key
        );
        expect(blocker, 'The forest must have a second enemy of the same kind').toBeTruthy();
        let blockerContext = Object.assign({}, context, {enemyKey: blocker.key, bodyKey: blocker.bodyKey});
        for(let enemyContext of [context, blockerContext]){
            await TestCombatBulletObstacleHits.placeWithoutHold(page, enemyContext, e2eGroup);
            await GameplayE2eStateApi.changeEnemyActions(gameConfig, e2eGroup, context.roomName, enemyContext.bodyKey, {
                range: TestCombatBulletObstacleHits.UNLIMITED_RANGE
            });
        }
        let line = await RoomObjectsApi.placeEnemiesOnLine(
            page,
            gameConfig,
            context.roomName,
            [blockerContext.bodyKey, context.bodyKey],
            TestCombatBulletObstacleHits.LINE_TILES_STEP,
            shot.lineDirection,
            context.timeout
        );
        expect(line.positions, 'The enemies must be placed on a clear line: '+line.error).toHaveLength(2);
        expect(line.reached, 'The client must show the player on the line start').toBe(true);
        await TestCombatBulletObstacleHits.prepareFireball(context, e2eGroup, {validateTargetOnHit: shot.validateTargetOnHit});
        await CombatSkillCasting.targetEnemy(page, context);
        let lives = {
            target: await CombatSkillCasting.fetchEnemyLife(context),
            blocker: await CombatSkillCasting.fetchEnemyLife(blockerContext)
        };
        await RoomMessagesRecorder.start(page);
        await CombatSkillCasting.clickWhenReady(page, context, TestCombatBulletObstacleHits.FIREBALL);
        let hitAct = TestCombatBulletObstacleHits.FIREBALL+ActionsConst.ACTIONS.SUFFIX.HIT;
        await RoomMessagesRecorder.waitForMessage(page, hitAct, context.timeout);
        let hits = await RoomMessagesRecorder.fetchMessages(page, hitAct);
        expect(hits, 'One hit').toHaveLength(1);
        expect(
            Math.hypot(hits[0].x - line.positions[0].x, hits[0].y - line.positions[0].y),
            'The bullet hits the enemy in between at '+line.positions[0].x+','+line.positions[0].y
        ).toBeLessThan(Navigation.TILE_SIZE / 2);
        return {context, blockerContext, lives};
    }

    static async runHitBodyBattleTest(page, screenshots, gameConfig, e2eGroup, longRun, lineDirection)
    {
        let enemies = await TestCombatBulletObstacleHits.prepareEnemyInBetween(page, gameConfig, e2eGroup, longRun, {
            validateTargetOnHit: false,
            lineDirection
        });
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(enemies.blockerContext),
            {message: 'The hit enemy starts its battle', timeout: enemies.context.timeout}
        ).toBe(1);
        await expect.poll(
            async () => (await CombatSkillCasting.fetchRecorded(enemies.context)).damages.length,
            {message: 'The fireball applies one damage', timeout: enemies.context.timeout}
        ).toBe(1);
        let [hitDamage] = (await CombatSkillCasting.fetchRecorded(enemies.context)).damages;
        expect(hitDamage.damage, 'The fireball damage is above zero').toBeGreaterThan(0);
        expect(
            {
                blocker: await CombatSkillCasting.fetchEnemyLife(enemies.blockerContext),
                target: await CombatSkillCasting.fetchEnemyLife(enemies.context)
            },
            'The damage lands on the hit enemy and the selected target behind it keeps its life'
        ).toEqual({blocker: enemies.lives.blocker - hitDamage.damage, target: enemies.lives.target});
        await screenshots.capture(page, 'bullet-hits-enemy-in-between');
    }

    static async runValidatedTargetTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let enemies = await TestCombatBulletObstacleHits.prepareEnemyInBetween(page, gameConfig, e2eGroup, longRun, {
            validateTargetOnHit: true,
            lineDirection: TestCombatBulletObstacleHits.LINE_DIRECTION
        });
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(enemies.context),
            {message: 'The target battle starts', timeout: enemies.context.timeout}
        ).toBe(1);
        await EnemyAggressionSteps.expectNoBattle(page, enemies.blockerContext, 'The hit enemy stays out of battle');
        await CombatSkillCasting.expectNothingApplied(page, enemies.context, 0, 0, 'A hit on another body applies nothing');
        expect(await CombatSkillCasting.fetchEnemyLife(enemies.blockerContext)).toBe(enemies.lives.blocker);
        expect(await CombatSkillCasting.fetchEnemyLife(enemies.context)).toBe(enemies.lives.target);
        await screenshots.capture(page, 'bullet-validated-target');
    }

    static async runStatsLessObjectTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let rock = (await RoomObjectsApi.fetchRoomObjects(gameConfig, context.roomName)).find(
            roomObject => gameConfig.e2eMiningRockKey === roomObject.assetKey
        );
        expect(rock, 'The forest must have a mining rock').toBeTruthy();
        await TestCombatBulletObstacleHits.placeWithoutHold(page, context, e2eGroup);
        let line = await RoomObjectsApi.placeEnemiesOnLine(
            page,
            gameConfig,
            context.roomName,
            [rock.bodyKey, context.bodyKey],
            TestCombatBulletObstacleHits.LINE_TILES_STEP,
            TestCombatBulletObstacleHits.LINE_DIRECTION,
            context.timeout
        );
        expect(line.positions, 'The rock and the target must be placed on a clear line: '+line.error).toHaveLength(2);
        expect(line.reached, 'The client must show the player on the line start').toBe(true);
        await TestCombatBulletObstacleHits.prepareFireball(context, e2eGroup, {validateTargetOnHit: false});
        await CombatSkillCasting.targetEnemy(page, context);
        let targetLife = await CombatSkillCasting.fetchEnemyLife(context);
        await RoomMessagesRecorder.start(page);
        await CombatSkillCasting.clickWhenReady(page, context, TestCombatBulletObstacleHits.FIREBALL);
        await CombatSkillCasting.expectNothingApplied(
            page,
            context,
            0,
            TestCombatBulletObstacleHits.QUIET_MS,
            'The bullet on the rock applies no damage'
        );
        let rockAfter = (await RoomObjectsApi.fetchRoomObjects(gameConfig, context.roomName)).find(
            roomObject => rock.key === roomObject.key
        );
        expect(
            [
                (await CombatSkillCasting.fetchSkill(context, TestCombatBulletObstacleHits.FIREBALL)).uses,
                await RoomMessagesRecorder.fetchMessages(page, TestCombatBulletObstacleHits.FIREBALL+ActionsConst.ACTIONS.SUFFIX.HIT),
                await CombatSkillCasting.fetchEnemyLife(context),
                [rockAfter.inState, rockAfter.x, rockAfter.y]
            ],
            'The fireball is shot, ends on the rock with no hit, the target keeps its life and the server keeps the rock'
        ).toEqual([1, [], targetLife, [rock.inState, line.positions[0].x, line.positions[0].y]]);
        await screenshots.capture(page, 'bullet-ends-on-stats-less-object');
    }

    static async runWallTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let targetSessionId = await secondPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        let placed = await RoomObjectsApi.placePlayersAcrossWall(
            page,
            gameConfig,
            context.roomName,
            targetSessionId,
            context.timeout
        );
        expect(placed.reached, 'The players must stand at both sides of a wall: '+placed.error).toBe(true);
        let fireball = TestCombatBulletObstacleHits.FIREBALL;
        await TestCombatBulletObstacleHits.prepareFireball(context, e2eGroup, {});
        let targetName = gameConfig.e2ePlayerName2;
        let targetLife = (await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, targetName)).life;
        await RoomMessagesRecorder.start(page);
        await CombatSkillCasting.targetPlayer(page, targetSessionId);
        await InterpolationFramesRecorder.start(page, {bullets: true});
        await CombatSkillCasting.clickWhenReady(page, context, fireball);
        await CombatSkillCasting.waitForEndStates(context, fireball, 1);
        expect(
            await InterpolationFramesRecorder.waitForBulletsFlightEnd(page, context.timeout),
            'The bullet sprite flies and is destroyed once the bullet ends on the wall'
        ).toBe(true);
        await InterpolationFramesRecorder.stop(page);
        expect(
            await page.evaluate(() => [...window.reldens.activeRoomEvents.room.state.bodies.keys()].filter(
                (bodyKey) => -1 !== bodyKey.indexOf('bullet')
            )),
            'The bullet body ended on the wall is removed from the room state'
        ).toEqual([]);
        await CombatSkillCasting.expectNothingApplied(page, context, 0, EnemyAggressionSteps.QUIET_MS, 'Ends on the wall');
        let hitAct = fireball+ActionsConst.ACTIONS.SUFFIX.HIT;
        expect(await RoomMessagesRecorder.fetchMessages(page, hitAct), 'No hit').toEqual([]);
        expect((await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, targetName)).life).toBe(targetLife);
        await screenshots.capture(page, 'bullet-ends-on-wall');
    }

    static run()
    {
        test.describe('Combat Bullet Obstacle Hits', () => {
            test('bullet that hits an enemy in between with validateTargetOnHit off starts that enemy battle', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBulletObstacleHits.runHitBodyBattleTest(page, screenshots, gameConfig, e2eGroup, longRun, TestCombatBulletObstacleHits.LINE_DIRECTION);
            });
            test('bullet flying to the right that hits an enemy in between with validateTargetOnHit off starts that enemy battle', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBulletObstacleHits.runHitBodyBattleTest(page, screenshots, gameConfig, e2eGroup, longRun, TestCombatBulletObstacleHits.RIGHT_LINE_DIRECTION);
            });
            test('bullet that hits an enemy in between with validateTargetOnHit on starts only the target battle', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBulletObstacleHits.runValidatedTargetTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('bullet that hits a room object without stats in between ends with no hit and the server keeps running', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBulletObstacleHits.runStatsLessObjectTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('bullet shot at a player behind a wall ends on the wall with no damage', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatBulletObstacleHits.runWallTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatBulletObstacleHits.run();
