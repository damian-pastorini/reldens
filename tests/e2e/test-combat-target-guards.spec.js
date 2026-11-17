/**
 *
 * Reldens - Test Combat Target Guards
 *
 * Tests the server guards on the skill target, on a placed forest enemy and a second player placed next to the first
 * one (CombatSkillCasting): a dead player target and an inactive enemy target take no damage, the self target only
 * runs with allowSelfTarget, the PvP disabled by the server switch (server/actions/pvp/enabled, read on the server
 * start) or by the room custom data stops the attacks on players, and the room custom data allActionsDisabled and
 * disallowedActions (the action act, a skill class, the target type, the target type with the act and the target type
 * with the skill class) refuse the listed actions while the others still run. Every refused or accepted cast is
 * proved by the skill logic recorded on the server.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { GameConst } = require('../../lib/game/constants');
const { ActionsConst } = require('../../lib/actions/constants');
const TypeAttack = require('../../lib/actions/server/skills/type-attack');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatTargetGuards
{

    static ATTACK_SHORT = 'attackShort';
    static HEAL = 'heal';
    static PLAYER_TARGET = 'target-'+GameConst.TYPE_PLAYER;

    static async prepareAttack(page, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestCombatTargetGuards.ATTACK_SHORT, {
            criticalChance: 0,
            range: 0
        });
        return context;
    }

    static async fetchPlayerLife(context, playerName)
    {
        return (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, context.roomName, playerName)).life;
    }

    static async disallow(context, group, customData)
    {
        await GameplayE2eStateApi.changeRoomCustomData(context.gameConfig, group, context.roomName, customData);
    }

    static async runInactiveTarget(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let attackShort = TestCombatTargetGuards.ATTACK_SHORT;
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let secondPlayer = await CombatSkillCasting.placeSecondPlayer(secondPage, context);
        let secondName = secondPlayer.playerName;
        await GameplayE2eStateApi.setPlayerState(gameConfig, context.roomName, secondName, GameConst.STATUS.DEATH);
        let secondLife = await TestCombatTargetGuards.fetchPlayerLife(context, secondName);
        await CombatSkillCasting.targetPlayer(page, secondPlayer.sessionId);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'A dead player target is ignored');
        expect(await TestCombatTargetGuards.fetchPlayerLife(context, secondName), 'No damage').toBe(secondLife);
        await GameplayE2eStateApi.setEnemyStats(
            gameConfig,
            context.roomName,
            context.bodyKey,
            {},
            GameConst.STATUS.DISABLED
        );
        let enemyLife = await CombatSkillCasting.fetchEnemyLife(context);
        await CombatSkillCasting.targetEnemy(page, context);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'Inactive enemy target');
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'No damage on the inactive enemy').toBe(enemyLife);
        await screenshots.capture(page, 'inactive-targets-ignored');
    }

    static async runSelfTarget(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let attackShort = TestCombatTargetGuards.ATTACK_SHORT;
        await CombatSkillCasting.targetSelf(page);
        let ownLife = await TestCombatTargetGuards.fetchPlayerLife(context, context.playerName);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'Self target not allowed');
        expect(await TestCombatTargetGuards.fetchPlayerLife(context, context.playerName), 'Kept').toBe(ownLife);
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {allowSelfTarget: true});
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, true, 'Self target allowed');
        let selfHit = [...(await CombatSkillCasting.fetchRecorded(context)).damages].pop();
        expect(await TestCombatTargetGuards.fetchPlayerLife(context, context.playerName), 'Self damage').toBe(
            ownLife - selfHit.damage
        );
        await screenshots.capture(page, 'self-target');
    }

    static async expectPvpOff(page, secondPage, context, label)
    {
        let secondPlayer = await CombatSkillCasting.placeSecondPlayer(secondPage, context);
        let secondLife = await TestCombatTargetGuards.fetchPlayerLife(context, secondPlayer.playerName);
        await CombatSkillCasting.targetPlayer(page, secondPlayer.sessionId);
        await CombatSkillCasting.expectSkillRun(page, context, TestCombatTargetGuards.ATTACK_SHORT, false, label);
        expect(await TestCombatTargetGuards.fetchPlayerLife(context, secondPlayer.playerName), label).toBe(secondLife);
    }

    static async runPvpServerOff(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await GameplayE2eStateApi.setPvpEnabled(gameConfig, e2eGroup, false);
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await TestCombatTargetGuards.expectPvpOff(page, secondPage, context, 'PvP disabled by the server');
        await screenshots.capture(page, 'pvp-server-disabled');
    }

    static async runPvpRoomOff(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await GameplayE2eStateApi.changeRoomCustomData(gameConfig, e2eGroup, CombatSkillCasting.ROOM_NAME, {
            pvpEnabled: false
        });
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        await TestCombatTargetGuards.expectPvpOff(page, secondPage, context, 'PvP disabled by the room');
        await screenshots.capture(page, 'pvp-room-disabled');
    }

    static async runActionsDisabled(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let attackShort = TestCombatTargetGuards.ATTACK_SHORT;
        await TestCombatTargetGuards.disallow(context, e2eGroup, {allActionsDisabled: true});
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'All actions disabled');
        await TestCombatTargetGuards.disallow(context, e2eGroup, {
            allActionsDisabled: false,
            disallowedActions: [ActionsConst.ACTION]
        });
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'The action act disallowed');
        await TestCombatTargetGuards.disallow(context, e2eGroup, {disallowedActions: []});
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, true, 'Allowed again');
        await screenshots.capture(page, 'room-actions-disabled');
    }

    static async runSkillClassOff(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let attackShort = TestCombatTargetGuards.ATTACK_SHORT;
        await TestCombatTargetGuards.disallow(context, e2eGroup, {disallowedActions: [TypeAttack.name]});
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'Disallowed skill class');
        await CombatSkillCasting.targetSelf(page);
        await CombatSkillCasting.expectSkillRun(page, context, TestCombatTargetGuards.HEAL, true, 'Another skill class');
        await screenshots.capture(page, 'room-skill-class-disallowed');
    }

    static async runTargetsOff(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await TestCombatTargetGuards.prepareAttack(page, gameConfig, e2eGroup, longRun);
        let attackShort = TestCombatTargetGuards.ATTACK_SHORT;
        let heal = TestCombatTargetGuards.HEAL;
        let playerTarget = TestCombatTargetGuards.PLAYER_TARGET;
        let disallowActions = async (actions) => await TestCombatTargetGuards.disallow(context, e2eGroup, {
            disallowedActions: actions
        });
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let secondPlayer = await CombatSkillCasting.placeSecondPlayer(secondPage, context);
        await CombatSkillCasting.targetPlayer(page, secondPlayer.sessionId);
        await disallowActions([playerTarget]);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'Player target');
        await disallowActions([playerTarget+'-'+ActionsConst.ACTION]);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'Player target act');
        await disallowActions([playerTarget+'-'+TypeAttack.name]);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, false, 'Player target skill class');
        await CombatSkillCasting.expectSkillRun(page, context, heal, true, 'Other skill class on the player');
        await disallowActions([playerTarget]);
        await CombatSkillCasting.targetEnemy(page, context);
        await CombatSkillCasting.expectSkillRun(page, context, attackShort, true, 'The enemy target is allowed');
        await screenshots.capture(page, 'room-targets-disallowed');
    }

    static run()
    {
        test.describe('Combat Target Guards', () => {
            test('dead player target and inactive enemy target take no damage', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runInactiveTarget(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('self target only runs with allowSelfTarget', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runSelfTarget(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('PvP disabled by the server switch stops the attacks on players', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runPvpServerOff(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('PvP disabled by the room stops the attacks on players', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runPvpRoomOff(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('room with all actions disabled or the action disallowed rejects the skill', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runActionsDisabled(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('room disallowed skill class refuses that skill and the others run', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runSkillClassOff(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('room disallowed player targets refuse the player and allow the enemy', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatTargetGuards.runTargetsOff(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatTargetGuards.run();
