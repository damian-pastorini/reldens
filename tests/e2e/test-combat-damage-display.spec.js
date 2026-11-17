/**
 *
 * Reldens - Test Combat Damage Display
 *
 * Tests the damage display config on a PvP hit in the town (CombatSkillCasting.preparePlayerTarget): the floating
 * damage text is shown only to the attacker by default, to the attacker and the target client with
 * "client/actions/damage/showAll", to none with "client/actions/damage/enabled" off while the damage is still applied,
 * and the damage chat message is sent and stored by default and neither sent nor stored with
 * "client/ui/chat/damageMessages" off. The config values are server wide, so the spec runs in the exclusive group,
 * they are overridden before the players log in (the client gets its config and the server attaches the chat damage
 * listener on the join) and restored by the group reset; every client records the added scene texts
 * (SceneSpritesRecorder) because the floating text destroys itself when its animation ends.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatDamageDisplay
{

    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static QUIET_MS = 1500;
    static DAMAGE_ENABLED_PATH = 'client/actions/damage/enabled';
    static DAMAGE_SHOW_ALL_PATH = 'client/actions/damage/showAll';
    static DAMAGE_MESSAGES_PATH = 'client/ui/chat/damageMessages';

    static async hitTargetPlayer(page, secondPage, gameConfig, e2eGroup, longRun, configOverrides)
    {
        for(let configPath of Object.keys(configOverrides)){
            await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, configPath, configOverrides[configPath]);
        }
        let context = await CombatSkillCasting.preparePlayerTarget(page, secondPage, gameConfig, longRun);
        let directAttack = TestCombatDamageDisplay.DIRECT_ATTACK;
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestCombatDamageDisplay.ATTACK_SHORT, directAttack);
        let attackerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: context.playerName});
        let damageRowsBefore = (await TestCombatDamageDisplay.loadDamageRows(gameConfig, attackerId)).length;
        for(let clientPage of [page, secondPage]){
            await clientPage.click(Selectors.hud.chatOpen);
            await SceneSpritesRecorder.start(clientPage);
        }
        return {
            context,
            attackerId,
            damageRowsBefore,
            hit: await CombatSkillCasting.castSkill(page, context, TestCombatDamageDisplay.ATTACK_SHORT, 1)
        };
    }

    static async loadDamageRows(gameConfig, attackerId)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'chat', {
            player_id: attackerId,
            message_type: ChatConst.TYPES.DAMAGE
        });
    }

    static async waitForDamageText(clientPage, attack, label)
    {
        await expect.poll(
            async () => await SceneSpritesRecorder.fetchTexts(clientPage),
            {message: label, timeout: attack.context.timeout}
        ).toContain(String(attack.hit.damage));
    }

    static async expectNoDamageText(clientPage, attack, label)
    {
        await clientPage.waitForTimeout(TestCombatDamageDisplay.QUIET_MS);
        expect(await SceneSpritesRecorder.fetchTexts(clientPage), label).not.toContain(String(attack.hit.damage));
    }

    static async runDefaultDisplayTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let attack = await TestCombatDamageDisplay.hitTargetPlayer(page, secondPage, gameConfig, e2eGroup, longRun, {});
        await TestCombatDamageDisplay.waitForDamageText(page, attack, 'The attacker sees its damage text');
        await screenshots.capture(page, 'damage-text-attacker');
        await TestCombatDamageDisplay.expectNoDamageText(secondPage, attack, 'Without showAll the target sees none');
        await expect.poll(
            async () => (await TestCombatDamageDisplay.loadDamageRows(gameConfig, attack.attackerId)).length,
            {message: 'The damage chat message is stored', timeout: attack.context.timeout}
        ).toBe(attack.damageRowsBefore + 1);
    }

    static async runShowAllTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let attack = await TestCombatDamageDisplay.hitTargetPlayer(page, secondPage, gameConfig, e2eGroup, longRun, {
            [TestCombatDamageDisplay.DAMAGE_SHOW_ALL_PATH]: true
        });
        await TestCombatDamageDisplay.waitForDamageText(page, attack, 'The attacker sees its damage text');
        await TestCombatDamageDisplay.waitForDamageText(secondPage, attack, 'With showAll the target sees it too');
        await screenshots.capture(secondPage, 'damage-text-show-all');
    }

    static async runDisabledTextTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let attack = await TestCombatDamageDisplay.hitTargetPlayer(page, secondPage, gameConfig, e2eGroup, longRun, {
            [TestCombatDamageDisplay.DAMAGE_ENABLED_PATH]: false,
            [TestCombatDamageDisplay.DAMAGE_SHOW_ALL_PATH]: true
        });
        await TestCombatDamageDisplay.expectNoDamageText(page, attack, 'Disabled, the attacker sees none');
        await TestCombatDamageDisplay.expectNoDamageText(secondPage, attack, 'Disabled, the target sees none');
        let target = await GameplayE2eStateApi.fetchPlayer(
            gameConfig,
            attack.context.roomName,
            attack.context.targetPlayer.playerName
        );
        expect(target.life, 'The damage is applied without its text').toBe(attack.hit.newValue);
        await screenshots.capture(page, 'damage-text-disabled');
    }

    static async runDisabledChatTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let attack = await TestCombatDamageDisplay.hitTargetPlayer(page, secondPage, gameConfig, e2eGroup, longRun, {
            [TestCombatDamageDisplay.DAMAGE_MESSAGES_PATH]: false
        });
        await page.waitForTimeout(TestCombatDamageDisplay.QUIET_MS);
        let damageMessage = attack.hit.damage+' damage on '+attack.context.targetPlayer.playerName;
        await expect(page.locator(Selectors.chat.tabContentGeneral), 'Attacker').not.toContainText(damageMessage);
        await expect(secondPage.locator(Selectors.chat.tabContentGeneral), 'Target').not.toContainText(damageMessage);
        expect(
            (await TestCombatDamageDisplay.loadDamageRows(gameConfig, attack.attackerId)).length,
            'No damage chat message is stored'
        ).toBe(attack.damageRowsBefore);
        await screenshots.capture(page, 'damage-chat-disabled');
    }

    static run()
    {
        test.describe('Combat Damage Display', () => {
            test('default damage text is shown only to the attacker and the damage chat message is stored', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageDisplay.runDefaultDisplayTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('damage text with showAll is shown to the attacker and the target', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageDisplay.runShowAllTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('disabled damage text is shown to nobody while the damage is applied', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageDisplay.runDisabledTextTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('disabled damage chat messages are neither sent nor stored', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageDisplay.runDisabledChatTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatDamageDisplay.run();
