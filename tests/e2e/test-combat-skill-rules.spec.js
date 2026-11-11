/**
 *
 * Reldens - Test Combat Skill Rules
 *
 * Tests the skills rules on a placed forest enemy with balanced stats (CombatSkillCasting): the owner condition that
 * refuses a cast without spending anything, the owner effects spent once per cast (on the enemy and on a self cast),
 * the uses limit, the full dodge with the dodged state and message, the damage and the critical reduced by the dodge
 * and aim difference, and the critical hit multiplier and fixed value shown and applied. Every expected value is
 * calculated from the stored skill rows and the stats and skill properties the test sets. The enemy fights back and
 * chases the player between the casts, so the cases that do not test the range cast with the range 0 (any distance).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { SkillConst } = require('@reldens/skills');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatSkillRules
{

    static FIREBALL = 'fireball';
    static HEAL = 'heal';
    static ATTACK_SHORT = 'attackShort';
    static NO_CRITICAL = {criticalChance: 0};
    static CRITICAL_ALWAYS = 100;
    static CRITICAL_MULTIPLIER = 2;
    static CRITICAL_FIXED_VALUE = 3;
    static DODGE_OVER_AIM = 50;
    static ANY_DISTANCE = 0;
    static RESOLVE_MARGIN_MS = 1500;
    static OWNER_CONDITIONS = 'skillsSkillOwnerConditions';
    static OWNER_EFFECTS = 'skillsSkillOwnerEffects';
    static ATTACK = 'skillsSkillAttack';

    static async runOwnerConditionTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let fireball = TestCombatSkillRules.FIREBALL;
        let requiredMp = await CombatSkillCasting.loadSkillValue(
            gameConfig,
            TestCombatSkillRules.OWNER_CONDITIONS,
            fireball,
            'value'
        );
        let mpCost = await CombatSkillCasting.loadSkillValue(
            gameConfig,
            TestCombatSkillRules.OWNER_EFFECTS,
            fireball,
            'value'
        );
        let castTime = await CombatSkillCasting.loadCastTime(gameConfig, fireball);
        await CombatSkillCasting.changeSkill(context, e2eGroup, fireball, TestCombatSkillRules.NO_CRITICAL);
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await CombatSkillCasting.setPlayerStats(context, {mp: requiredMp - 1});
        await CombatSkillCasting.clickWhenReady(page, context, fireball);
        await CombatSkillCasting.expectNothingApplied(
            page,
            context,
            0,
            castTime + TestCombatSkillRules.RESOLVE_MARGIN_MS,
            'The condition must refuse the cast'
        );
        expect(await CombatSkillCasting.fetchPlayerStat(context, 'mp'), 'No mp spent').toBe(requiredMp - 1);
        expect((await CombatSkillCasting.fetchSkill(context, fireball)).uses, 'No use counted').toBe(0);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'No damage').toBe(lifeBefore);
        await screenshots.capture(page, 'owner-condition-refused');
        await CombatSkillCasting.setPlayerStats(context, {mp: requiredMp});
        let recordedDamage = await CombatSkillCasting.castSkill(page, context, fireball, 1);
        expect(await CombatSkillCasting.fetchPlayerStat(context, 'mp'), 'Cast at the limit').toBe(requiredMp - mpCost);
        expect((await CombatSkillCasting.fetchSkill(context, fireball)).uses).toBe(1);
        expect(await CombatSkillCasting.fetchEnemyLife(context)).toBe(lifeBefore - recordedDamage.damage);
    }

    static async runOwnerEffectsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let fireball = TestCombatSkillRules.FIREBALL;
        let heal = TestCombatSkillRules.HEAL;
        let effects = TestCombatSkillRules.OWNER_EFFECTS;
        let fireballCost = await CombatSkillCasting.loadSkillValue(gameConfig, effects, fireball, 'value');
        let healCost = await CombatSkillCasting.loadSkillValue(gameConfig, effects, heal, 'value');
        let castTime = await CombatSkillCasting.loadCastTime(gameConfig, fireball);
        await CombatSkillCasting.changeSkill(context, e2eGroup, fireball, TestCombatSkillRules.NO_CRITICAL);
        let startMp = fireballCost * 3;
        await CombatSkillCasting.setPlayerStats(context, {mp: startMp});
        await CombatSkillCasting.castSkill(page, context, fireball, 1);
        await CombatSkillCasting.expectNothingApplied(page, context, 1, castTime, 'One cast must hit once');
        expect(await CombatSkillCasting.fetchPlayerStat(context, 'mp'), 'Spent once').toBe(startMp - fireballCost);
        await CombatSkillCasting.setPlayerStats(context, {mp: startMp});
        await CombatSkillCasting.targetSelf(page);
        await CombatSkillCasting.clickWhenReady(page, context, heal);
        await CombatSkillCasting.waitForEndStates(context, heal, 1);
        expect(await CombatSkillCasting.fetchPlayerStat(context, 'mp'), 'Self cast spent once').toBe(startMp - healCost);
        await screenshots.capture(page, 'owner-effects-spent-once');
    }

    static async runUsesLimitTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatSkillRules.ATTACK_SHORT;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {criticalChance: 0, usesLimit: 1});
        let recordedDamage = await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        let lifeAfterHit = await CombatSkillCasting.fetchEnemyLife(context);
        expect(recordedDamage.newValue).toBe(lifeAfterHit);
        await CombatSkillCasting.clickWhenReady(page, context, attackShort);
        await CombatSkillCasting.expectNothingApplied(
            page,
            context,
            1,
            TestCombatSkillRules.RESOLVE_MARGIN_MS,
            'The uses limit must refuse the second cast'
        );
        expect((await CombatSkillCasting.fetchSkill(context, attackShort)).uses, 'Uses').toBe(1);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'No second damage').toBe(lifeAfterHit);
        await screenshots.capture(page, 'uses-limit-refused');
    }

    static async runFullDodgeTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatSkillRules.ATTACK_SHORT;
        let attackRow = await CombatSkillCasting.loadSkillRow(gameConfig, TestCombatSkillRules.ATTACK, attackShort);
        let dodgeLimit = CombatSkillCasting.BALANCED_PLAYER_STATS.aim * Number(attackRow.dodgeOverAimSuccess);
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: 0,
            dodgeFullEnabled: true,
            range: TestCombatSkillRules.ANY_DISTANCE
        });
        await page.click(Selectors.hud.chatOpen);
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await CombatSkillCasting.setEnemyStats(context, {dodge: dodgeLimit + 1});
        await CombatSkillCasting.clickWhenReady(page, context, attackShort);
        let endState = await CombatSkillCasting.waitForEndStates(context, attackShort, 1);
        expect(endState.lastState, 'Dodged state').toBe(SkillConst.SKILL_STATES.DODGED);
        expect((await CombatSkillCasting.fetchRecorded(context)).damages, 'No damage recorded').toEqual([]);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'No damage applied').toBe(lifeBefore);
        await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText(' dodged ', {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await screenshots.capture(page, 'full-dodge');
        await CombatSkillCasting.setEnemyStats(context, {dodge: dodgeLimit});
        expect(
            (await CombatSkillCasting.castSkill(page, context, attackShort, 1)).damage,
            'A dodge equal to the limit is not a full dodge'
        ).toBe(Number(attackRow.hitDamage));
    }

    static async runDodgeAffectedTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatSkillRules.ATTACK_SHORT;
        let hitDamage = await CombatSkillCasting.loadSkillValue(
            gameConfig,
            TestCombatSkillRules.ATTACK,
            attackShort,
            'hitDamage'
        );
        let ownerAim = CombatSkillCasting.BALANCED_PLAYER_STATS.aim;
        let targetDodge = ownerAim + TestCombatSkillRules.DODGE_OVER_AIM;
        let dodgeAimDiff = (targetDodge - ownerAim) * 100 / ownerAim;
        let reducedDamage = hitDamage - Math.floor(hitDamage * dodgeAimDiff / 100);
        let criticalDiff = reducedDamage * TestCombatSkillRules.CRITICAL_MULTIPLIER - reducedDamage;
        await CombatSkillCasting.setEnemyStats(context, {dodge: targetDodge});
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: 0,
            dodgeFullEnabled: false,
            damageAffected: false,
            criticalAffected: false,
            range: TestCombatSkillRules.ANY_DISTANCE
        });
        let castDamage = async (castsCount) => (
            await CombatSkillCasting.castSkill(page, context, attackShort, castsCount)
        ).damage;
        expect(await castDamage(1), 'Not affected').toBe(hitDamage);
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {damageAffected: true});
        expect(await castDamage(2), 'Damage affected').toBe(reducedDamage);
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: TestCombatSkillRules.CRITICAL_ALWAYS,
            criticalMultiplier: TestCombatSkillRules.CRITICAL_MULTIPLIER,
            criticalFixedValue: 0
        });
        expect(await castDamage(3), 'Full critical').toBe(reducedDamage + criticalDiff);
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {criticalAffected: true});
        expect(await castDamage(4), 'Critical affected').toBe(
            reducedDamage + criticalDiff - Math.floor(criticalDiff * dodgeAimDiff / 100)
        );
        await screenshots.capture(page, 'dodge-affected-damage');
    }

    static async runCriticalHitTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatSkillRules.ATTACK_SHORT;
        let attackRow = await CombatSkillCasting.loadSkillRow(gameConfig, TestCombatSkillRules.ATTACK, attackShort);
        let criticalDamage = Number(attackRow.hitDamage) * TestCombatSkillRules.CRITICAL_MULTIPLIER
            + TestCombatSkillRules.CRITICAL_FIXED_VALUE;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: TestCombatSkillRules.CRITICAL_ALWAYS,
            criticalMultiplier: TestCombatSkillRules.CRITICAL_MULTIPLIER,
            criticalFixedValue: TestCombatSkillRules.CRITICAL_FIXED_VALUE,
            range: TestCombatSkillRules.ANY_DISTANCE
        });
        await page.click(Selectors.hud.chatOpen);
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        let recordedDamage = await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        expect(recordedDamage.damage, 'Critical damage').toBe(criticalDamage);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'Applied').toBe(lifeBefore - criticalDamage);
        await expect(page.locator(Selectors.chat.tabContentGeneral)).toContainText(criticalDamage+' damage on', {
            timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)
        });
        await screenshots.capture(page, 'critical-hit');
    }

    static run()
    {
        test.describe('Combat Skill Rules', () => {
            test('owner condition not met refuses the skill with no damage and no cost', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatSkillRules.runOwnerConditionTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('owner effects are spent once per cast', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatSkillRules.runOwnerEffectsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('skill over its uses limit is refused', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatSkillRules.runUsesLimitTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('target dodge over the owner aim fails the attack with the dodged state', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatSkillRules.runFullDodgeTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('damage and critical affected by the dodge and aim difference', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatSkillRules.runDodgeAffectedTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('critical hit adds the multiplier and the fixed value to the applied damage', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatSkillRules.runCriticalHitTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatSkillRules.run();
