/**
 *
 * Reldens - Test Chat Combat
 *
 * Tests the combat chat lines (ChatSteps, the messages each client receives recorded): a PvP hit in the town
 * (CombatSkillCasting.preparePlayerTarget, the direct attack) sends the damage line to the attacker and to the damaged
 * player and not to an unrelated third player; a fully dodged PvP hit sends the dodge line to both; a heal on the other
 * player sends the modifiers line to both; a hit dealing 0 sends no line; with the damage, effect and dodge messages
 * off (changed for the group before the logins, the server attaches the chat listeners on the join) no line is sent;
 * and an enemy hit on a player in the forest sends the enemy damage line to that player, and none with the damage
 * messages off (the forest room disposed first, so its enemies attach the chat listeners with the config of the case).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatCombat
{

    static ATTACK = 'skillsSkillAttack';
    static ATTACK_SHORT = 'attackShort';
    static HEAL = 'heal';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static SETTLE_MS = 1500;
    static MESSAGES_OFF = {
        'client/ui/chat/damageMessages': false,
        'client/ui/chat/effectMessages': false,
        'client/ui/chat/dodgeMessages': false
    };

    static async overrideConfig(context, configValues)
    {
        for(let configPath of Object.keys(configValues)){
            await E2eSeedAndRestoreApi.overrideConfig(context.gameConfig, context.e2eGroup, configPath, configValues[configPath]);
        }
    }

    static async preparePvp(context, configValues = {}, withThird = false)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        await TestChatCombat.overrideConfig(context, configValues);
        let combat = await CombatSkillCasting.preparePlayerTarget(context.page, context.secondPage, context.gameConfig, context.longRun);
        await CombatSkillCasting.changeSkill(combat, context.e2eGroup, TestChatCombat.ATTACK_SHORT, TestChatCombat.DIRECT_ATTACK);
        return {combat, pages: await ChatSteps.recordPlayersChat(context, withThird)};
    }

    static async fetchLines(page, snippet)
    {
        return (await ChatSteps.fetchChat(page)).filter(message => snippet === message[ChatConst.MESSAGE.KEY]);
    }

    static async expectLine(page, snippet, message)
    {
        await expect.poll(async () => (await TestChatCombat.fetchLines(page, snippet)).length, {message, timeout: TimeConstants.SERVER_RESPONSE})
            .toBe(1);
    }

    static async runPvpDamageTest(context)
    {
        let pvp = await TestChatCombat.preparePvp(context, {}, true);
        let hit = await CombatSkillCasting.castSkill(context.page, pvp.combat, TestChatCombat.ATTACK_SHORT, 1);
        for(let page of [context.page, context.secondPage]){
            await TestChatCombat.expectLine(page, ChatConst.SNIPPETS.PLAYER.DAMAGE, 'The damage line reaches the attacker and the target');
            let line = [...await TestChatCombat.fetchLines(page, ChatConst.SNIPPETS.PLAYER.DAMAGE)].shift();
            expect(line[ChatConst.MESSAGE.DATA.KEY][ChatConst.MESSAGE.DATA.DAMAGE], 'The line damage').toBe(hit.damage);
        }
        await pvp.pages[2].waitForTimeout(TestChatCombat.SETTLE_MS);
        expect(await TestChatCombat.fetchLines(pvp.pages[2], ChatConst.SNIPPETS.PLAYER.DAMAGE), 'The third player gets nothing')
            .toEqual([]);
    }

    static async runPvpDodgeTest(context)
    {
        let pvp = await TestChatCombat.preparePvp(context);
        let attackRow = await CombatSkillCasting.loadSkillRow(context.gameConfig, TestChatCombat.ATTACK, TestChatCombat.ATTACK_SHORT);
        let dodgeLimit = CombatSkillCasting.BALANCED_PLAYER_STATS.aim * Number(attackRow.dodgeOverAimSuccess);
        await CombatSkillCasting.changeSkill(pvp.combat, context.e2eGroup, TestChatCombat.ATTACK_SHORT, {dodgeFullEnabled: true});
        let dodged = await CombatSkillCasting.setPlayerStats(Object.assign({}, pvp.combat, {playerName: pvp.combat.targetPlayer.playerName}), {
            dodge: dodgeLimit + 1
        });
        expect(dodged.error, 'The target dodge is raised').toBeUndefined();
        await CombatSkillCasting.clickWhenReady(context.page, pvp.combat, TestChatCombat.ATTACK_SHORT);
        for(let page of [context.page, context.secondPage]){
            await TestChatCombat.expectLine(page, ChatConst.SNIPPETS.PLAYER.DODGED_SKILL, 'The dodge line reaches both players');
        }
    }

    static async runHealModifiersTest(context)
    {
        let pvp = await TestChatCombat.preparePvp(context);
        await CombatSkillCasting.expectSkillRun(context.page, pvp.combat, TestChatCombat.HEAL, true, 'The heal runs on the other player');
        for(let page of [context.page, context.secondPage]){
            await TestChatCombat.expectLine(page, ChatConst.SNIPPETS.MODIFIERS_APPLY, 'The modifiers line reaches both players');
        }
    }

    static async runZeroDamageTest(context)
    {
        let pvp = await TestChatCombat.preparePvp(context);
        await CombatSkillCasting.changeSkill(pvp.combat, context.e2eGroup, TestChatCombat.ATTACK_SHORT, {hitDamage: 0});
        await CombatSkillCasting.clickWhenReady(context.page, pvp.combat, TestChatCombat.ATTACK_SHORT);
        await CombatSkillCasting.waitForEndStates(pvp.combat, TestChatCombat.ATTACK_SHORT, 1);
        await context.page.waitForTimeout(TestChatCombat.SETTLE_MS);
        expect(await TestChatCombat.fetchLines(context.page, ChatConst.SNIPPETS.PLAYER.DAMAGE), 'No line for 0 damage').toEqual([]);
    }

    static async runPlayerLinesOffTest(context)
    {
        let pvp = await TestChatCombat.preparePvp(context, TestChatCombat.MESSAGES_OFF);
        await CombatSkillCasting.castSkill(context.page, pvp.combat, TestChatCombat.ATTACK_SHORT, 1);
        await CombatSkillCasting.expectSkillRun(context.page, pvp.combat, TestChatCombat.HEAL, true, 'The heal runs');
        await context.page.waitForTimeout(TestChatCombat.SETTLE_MS);
        for(let page of [context.page, context.secondPage]){
            expect(
                (await ChatSteps.fetchChat(page)).filter(message => ChatConst.TYPES.MESSAGE !== message[ChatConst.TYPES.KEY]
                    && ChatConst.TYPES.SYSTEM !== message[ChatConst.TYPES.KEY]),
                'No combat line with the messages off'
            ).toEqual([]);
        }
    }

    static async runEnemyHitTest(context, configValues, expectedLines)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 2, context.longRun));
        await TestChatCombat.overrideConfig(context, configValues);
        await GameplayE2eStateApi.disposeRoom(context.gameConfig, Login.FOREST_ROOM_NAME);
        let passiveEnemyKey = TestCombatDeath.loadPassiveEnemyKey();
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        await ChatSteps.recordChat(context.page);
        await TestCombatDeath.startEnemyAttack(context.gameConfig, passiveEnemyKey);
        await context.page.waitForTimeout(TestChatCombat.SETTLE_MS * 2);
        await RoomObjectsApi.disableEnemies(context.gameConfig, Login.FOREST_ROOM_NAME);
        expect((await TestChatCombat.fetchLines(context.page, ChatConst.SNIPPETS.NPC_DAMAGE)).length > 0, 'The enemy damage lines')
            .toBe(expectedLines);
    }

    static run()
    {
        test.describe('Chat Combat', () => {
            test('PvP hit sends the damage line to the attacker and the target only', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runPvpDamageTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('PvP dodge sends the dodge line to both players', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runPvpDodgeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('heal on a player sends the modifiers line to both players', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runHealModifiersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('hit dealing 0 sends no damage line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runZeroDamageTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player combat lines off send no line', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runPlayerLinesOffTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('enemy hit sends the enemy damage line to the player', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runEnemyHitTest({page, screenshots, gameConfig, e2eGroup, longRun}, {}, true);
            });
            test('enemy damage lines off send no line', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatCombat.runEnemyHitTest({page, screenshots, gameConfig, e2eGroup, longRun}, TestChatCombat.MESSAGES_OFF, false);
            });
        });
    }

}

TestChatCombat.run();
