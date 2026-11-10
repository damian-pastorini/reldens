/**
 *
 * Reldens - Test Combat Action Guards
 *
 * Tests the server guards of the player actions on a placed forest enemy (CombatSkillCasting): a second click during
 * the skill delay, another action and the movement during a cast time (the skill blocks the movement), the pending cast
 * of a player that left the room, a skill sent with no target, the skill and the movement of a disabled or dead
 * player, the tampered action messages (a target id not in the room, an unknown target type and an unknown skill key,
 * against the same message untampered, which is applied) and a skill sent while the player body is changing scene (a
 * group override restored by the reset). The movement is a walk away from the placed enemy, so the enemy body never
 * stops it.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { LoginServerApi } = require('./helpers/login-server-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatActionGuards
{

    static ATTACK_SHORT = 'attackShort';
    static ATTACK_BULLET = 'attackBullet';
    static LONG_CAST_TIME_MS = 3000;
    static QUIET_MS = 1500;
    static WALK_MS = 600;
    static MISSING_TARGET_ID = 'e2e-missing-target';
    static UNKNOWN_TARGET_TYPE = 'e2e-unknown-type';
    static UNKNOWN_SKILL_KEY = 'e2eUnknownSkill';

    static async prepareDirectAttack(page, gameConfig, e2eGroup, longRun, properties)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await CombatSkillCasting.changeSkill(
            context,
            e2eGroup,
            TestCombatActionGuards.ATTACK_SHORT,
            Object.assign({criticalChance: 0, range: 0}, properties)
        );
        return context;
    }

    static fetchAwayKey(context, position)
    {
        let enemyDiffX = context.enemyPosition.x - position.x;
        let enemyDiffY = context.enemyPosition.y - position.y;
        let awayKey = 0 < enemyDiffY ? 'ArrowUp' : 'ArrowDown';
        if(Math.abs(enemyDiffX) >= Math.abs(enemyDiffY)){
            awayKey = 0 < enemyDiffX ? 'ArrowLeft' : 'ArrowRight';
        }
        return awayKey;
    }

    static async walkAway(page, context)
    {
        let walk = {
            before: await GameplayE2eStateApi.fetchPlayer(context.gameConfig, context.roomName, context.playerName)
        };
        let awayKey = TestCombatActionGuards.fetchAwayKey(context, walk.before);
        await page.keyboard.down(awayKey);
        await page.waitForTimeout(TestCombatActionGuards.WALK_MS);
        await page.keyboard.up(awayKey);
        await page.waitForTimeout(TestCombatActionGuards.WALK_MS);
        walk.after = await GameplayE2eStateApi.fetchPlayer(context.gameConfig, context.roomName, context.playerName);
        walk.fromPosition = [walk.before.x, walk.before.y];
        walk.toPosition = [walk.after.x, walk.after.y];
        return walk;
    }

    static async runDoubleClickTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {});
        let attackShort = TestCombatActionGuards.ATTACK_SHORT;
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await expect.poll(
            async () => (await CombatSkillCasting.fetchSkill(context, attackShort)).isReady,
            {timeout: context.timeout}
        ).toBe(true);
        await page.dblclick(Selectors.combat.skillButton(attackShort), {force: true});
        await CombatSkillCasting.expectNothingApplied(
            page,
            context,
            1,
            TestCombatActionGuards.QUIET_MS,
            'The second click during the skill delay must not hit'
        );
        let recordedDamage = [...(await CombatSkillCasting.fetchRecorded(context)).damages].pop();
        expect((await CombatSkillCasting.fetchSkill(context, attackShort)).uses, 'One use').toBe(1);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'One damage').toBe(lifeBefore - recordedDamage.damage);
        await screenshots.capture(page, 'double-click-one-hit');
    }

    static async runCastTimeTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {
            castTime: TestCombatActionGuards.LONG_CAST_TIME_MS,
            customData: sc.toJsonString({blockMovement: true})
        });
        let attackShort = TestCombatActionGuards.ATTACK_SHORT;
        let attackBullet = TestCombatActionGuards.ATTACK_BULLET;
        await CombatSkillCasting.startCast(page, context, attackShort);
        await page.click(Selectors.combat.skillButton(attackBullet), {force: true});
        let castWalk = await TestCombatActionGuards.walkAway(page, context);
        expect(castWalk.toPosition, 'No movement during the cast').toEqual(castWalk.fromPosition);
        await CombatSkillCasting.waitForEndStates(context, attackShort, 1);
        expect((await CombatSkillCasting.fetchSkill(context, attackBullet)).uses, 'Other action rejected').toBe(0);
        let freeWalk = await TestCombatActionGuards.walkAway(page, context);
        expect(freeWalk.toPosition, 'Moves after the cast').not.toEqual(freeWalk.fromPosition);
        await screenshots.capture(page, 'cast-time-blocks-actions');
    }

    static async runLeaveDuringCastTest(page, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {
            castTime: TestCombatActionGuards.LONG_CAST_TIME_MS
        });
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await CombatSkillCasting.startCast(page, context, TestCombatActionGuards.ATTACK_SHORT);
        await page.goto('about:blank');
        await expect.poll(
            async () => await LoginServerApi.fetchPlayersInRoom(gameConfig, context.roomName, context.playerName),
            {message: 'The player must leave the room', timeout: context.timeout}
        ).toBe(0);
        await page.waitForTimeout(TestCombatActionGuards.LONG_CAST_TIME_MS + TestCombatActionGuards.QUIET_MS);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'The pending cast never lands').toBe(lifeBefore);
    }

    static async runNoTargetTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {});
        let attackShort = TestCombatActionGuards.ATTACK_SHORT;
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget), 'No target').toBe(false);
        await CombatSkillCasting.clickWhenReady(page, context, attackShort);
        await CombatSkillCasting.expectNothingApplied(page, context, 0, TestCombatActionGuards.QUIET_MS, 'No target');
        expect((await CombatSkillCasting.fetchSkill(context, attackShort)).uses, 'No use').toBe(0);
        expect((await CombatSkillCasting.fetchRecorded(context)).endStates, 'No skill logic').toEqual([]);
        await screenshots.capture(page, 'skill-without-target');
    }

    static async expectStateIgnoresSkill(page, context, inState, label)
    {
        await GameplayE2eStateApi.setPlayerState(context.gameConfig, context.roomName, context.playerName, inState);
        await page.click(Selectors.combat.skillButton(TestCombatActionGuards.ATTACK_SHORT), {force: true});
        await CombatSkillCasting.expectNothingApplied(page, context, 0, TestCombatActionGuards.QUIET_MS, label);
        expect((await CombatSkillCasting.fetchSkill(context, TestCombatActionGuards.ATTACK_SHORT)).uses, label).toBe(0);
    }

    static async runInactivePlayerTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {});
        await TestCombatActionGuards.expectStateIgnoresSkill(page, context, GameConst.STATUS.DISABLED, 'Disabled');
        await TestCombatActionGuards.expectStateIgnoresSkill(page, context, GameConst.STATUS.DEATH, 'Dead');
        let deadWalk = await TestCombatActionGuards.walkAway(page, context);
        expect(deadWalk.toPosition, 'The dead player does not move').toEqual(deadWalk.fromPosition);
        await screenshots.capture(page, 'dead-player-actions-ignored');
        await GameplayE2eStateApi.setPlayerState(
            gameConfig,
            context.roomName,
            context.playerName,
            GameConst.STATUS.ACTIVE
        );
        await CombatSkillCasting.castSkill(page, context, TestCombatActionGuards.ATTACK_SHORT, 1);
    }

    static async expectTamperedIgnored(page, context, message, label)
    {
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await RoomMessagesRecorder.sendMessage(page, message);
        await CombatSkillCasting.expectNothingApplied(page, context, 0, TestCombatActionGuards.QUIET_MS, label);
        expect((await CombatSkillCasting.fetchRecorded(context)).endStates, label).toEqual([]);
        expect(await CombatSkillCasting.fetchEnemyLife(context), label).toBe(lifeBefore);
    }

    static async runTamperedActionsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {});
        let enemyTarget = {
            id: await page.evaluate(
                (bodyKey) => window.reldens.getActiveScene().objectsAnimations[bodyKey].key,
                context.bodyKey
            ),
            type: ObjectsConst.TYPE_OBJECT
        };
        let attack = {act: ActionsConst.ACTION, type: TestCombatActionGuards.ATTACK_SHORT};
        await TestCombatActionGuards.expectTamperedIgnored(page, context, {
            ...attack,
            target: {id: TestCombatActionGuards.MISSING_TARGET_ID, type: ObjectsConst.TYPE_OBJECT}
        }, 'Target id not in the room');
        await TestCombatActionGuards.expectTamperedIgnored(page, context, {
            ...attack,
            target: {id: enemyTarget.id, type: TestCombatActionGuards.UNKNOWN_TARGET_TYPE}
        }, 'Unknown target type');
        await TestCombatActionGuards.expectTamperedIgnored(page, context, {
            ...attack,
            type: TestCombatActionGuards.UNKNOWN_SKILL_KEY,
            target: enemyTarget
        }, 'Unknown skill key');
        await RoomMessagesRecorder.sendMessage(page, {...attack, target: enemyTarget});
        await expect.poll(
            async () => (await CombatSkillCasting.fetchRecorded(context)).damages.length,
            {message: 'The same message untampered is applied', timeout: context.timeout}
        ).toBe(1);
        await screenshots.capture(page, 'tampered-actions-ignored');
    }

    static async runChangingSceneTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatActionGuards.prepareDirectAttack(page, gameConfig, e2eGroup, longRun, {});
        await GameplayE2eStateApi.changePlayerBody(gameConfig, e2eGroup, context.roomName, context.playerName, {
            isChangingScene: true
        });
        await page.click(Selectors.combat.skillButton(TestCombatActionGuards.ATTACK_SHORT), {force: true});
        await CombatSkillCasting.expectNothingApplied(page, context, 0, TestCombatActionGuards.QUIET_MS, 'Scene change');
        expect((await CombatSkillCasting.fetchSkill(context, TestCombatActionGuards.ATTACK_SHORT)).uses, 'No use').toBe(0);
        await screenshots.capture(page, 'cast-while-changing-scene');
    }

    static run()
    {
        test.describe('Combat Action Guards', () => {
            test('second click during the skill delay deals no second damage', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runDoubleClickTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('cast time rejects other actions and blocks the movement until the cast ends', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runCastTimeTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('player leaving the room during a cast never lands the pending cast', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runLeaveDuringCastTest(page, gameConfig, e2eGroup, longRun);
            });
            test('skill sent with no target selected does nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runNoTargetTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('disabled or dead player skill and dead player movement are ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runInactivePlayerTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('tampered actions with a missing target, an unknown target type or an unknown skill are ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runTamperedActionsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('skill sent while the player changes scene is ignored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatActionGuards.runChangingSceneTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatActionGuards.run();
