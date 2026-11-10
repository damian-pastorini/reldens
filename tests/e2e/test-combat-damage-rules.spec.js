/**
 *
 * Reldens - Test Combat Damage Rules
 *
 * Tests the attack damage rules on a placed forest enemy with balanced stats (CombatSkillCasting): the damage follows
 * the attack and defense totals difference (lower attack, the attack raised by an equipped item), the direct damage
 * ignores both, the affected property below zero allowed on an enemy and refused on a player target already on zero,
 * the range 0 reaching a far target while the stored range rejects it, and the target out of range when the cast time
 * ends. The expected damages are calculated with the attack skill formula from the stored skill and item rows.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
const { SkillConst } = require('@reldens/skills');
const { ModifierConst } = require('@reldens/modifiers');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatDamageRules
{

    static ATTACK_SHORT = 'attackShort';
    static ITEM_KEY = 'axe';
    static LOW_ATTACK = 20;
    static ANY_DISTANCE = 0;
    static LAST_LIFE_POINTS = 3;
    static FAR_TILES = 3;
    static LONG_CAST_TIME_MS = 3000;
    static NOTHING_APPLIED_WAIT_MS = 1500;

    static calculateDamage(hitDamage, ownerAttack, targetDefense)
    {
        let attackDiff = ownerAttack - targetDefense;
        let damage = hitDamage;
        if(0 < attackDiff){
            damage = hitDamage + Math.ceil(Math.min(99, attackDiff * 100 / targetDefense) * hitDamage / 100);
        }
        if(0 > attackDiff){
            damage = hitDamage - Math.floor(Math.min(99, -attackDiff * 100 / ownerAttack) * hitDamage / 100);
        }
        return damage;
    }

    static async loadHitDamage(gameConfig)
    {
        return await CombatSkillCasting.loadSkillValue(
            gameConfig,
            'skillsSkillAttack',
            TestCombatDamageRules.ATTACK_SHORT,
            'hitDamage'
        );
    }

    static async loadItemModifier(gameConfig, itemKey)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItemModifiers', {
            item_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'itemsItem', {key: itemKey})
        })).shift();
    }

    static async equipItem(page, context, itemKey)
    {
        let attackBefore = await CombatSkillCasting.fetchPlayerStat(context, 'atk');
        await page.click(Selectors.hud.inventoryOpen);
        await expect(page.locator(Selectors.inventory.ui)).toBeVisible();
        await page.click(Selectors.inventory.itemImage(itemKey));
        await page.click(Selectors.inventory.itemEquip(itemKey));
        await page.click(Selectors.hud.inventoryClose);
        await expect.poll(
            async () => await CombatSkillCasting.fetchPlayerStat(context, 'atk'),
            {message: 'The equipped '+itemKey+' must change the attack', timeout: context.timeout}
        ).not.toBe(attackBefore);
        return await CombatSkillCasting.fetchPlayerStat(context, 'atk');
    }

    static async runAttackDefenseTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatDamageRules.ATTACK_SHORT;
        let hitDamage = await TestCombatDamageRules.loadHitDamage(gameConfig);
        let speed = CombatSkillCasting.BALANCED_PLAYER_STATS.speed;
        let targetDefense = CombatSkillCasting.BALANCED_ENEMY_STATS.def + CombatSkillCasting.BALANCED_ENEMY_STATS.speed;
        let lowAttack = TestCombatDamageRules.LOW_ATTACK;
        let itemModifier = await TestCombatDamageRules.loadItemModifier(gameConfig, TestCombatDamageRules.ITEM_KEY);
        expect(Number(itemModifier.operation), 'The item increases the attack by a percentage').toBe(
            ModifierConst.OPS.INC_P
        );
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: 0,
            range: TestCombatDamageRules.ANY_DISTANCE
        });
        let castDamage = async (castsCount) => (
            await CombatSkillCasting.castSkill(page, context, attackShort, castsCount)
        ).damage;
        expect(await castDamage(1), 'Balanced').toBe(hitDamage);
        await CombatSkillCasting.setPlayerStats(context, {atk: lowAttack});
        expect(await castDamage(2), 'Lower attack').toBe(
            TestCombatDamageRules.calculateDamage(hitDamage, lowAttack + speed, targetDefense)
        );
        let balancedAttack = CombatSkillCasting.BALANCED_PLAYER_STATS.atk;
        await CombatSkillCasting.setPlayerStats(context, {atk: balancedAttack});
        let equippedAttack = await TestCombatDamageRules.equipItem(page, context, TestCombatDamageRules.ITEM_KEY);
        expect(equippedAttack, 'Item modifier').toBe(
            balancedAttack + Math.round(balancedAttack * Number(itemModifier.value) / 100)
        );
        let equippedDamage = TestCombatDamageRules.calculateDamage(hitDamage, equippedAttack + speed, targetDefense);
        expect(equippedDamage, 'The item must change the expected damage').not.toBe(hitDamage);
        expect(await castDamage(3), 'Equipped').toBe(equippedDamage);
        await screenshots.capture(page, 'equipped-item-damage');
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {applyDirectDamage: true});
        expect(await castDamage(4), 'Direct with the higher attack').toBe(hitDamage);
        await CombatSkillCasting.setPlayerStats(context, {atk: lowAttack});
        expect(await castDamage(5), 'Direct with the lower attack').toBe(hitDamage);
    }

    static async runBelowZero(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatDamageRules.ATTACK_SHORT;
        let hitDamage = await TestCombatDamageRules.loadHitDamage(gameConfig);
        let lastLife = TestCombatDamageRules.LAST_LIFE_POINTS;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: 0,
            range: TestCombatDamageRules.ANY_DISTANCE,
            allowEffectBelowZero: true
        });
        await GameplayE2eStateApi.setEnemyBodyLife(gameConfig, context.roomName, context.bodyKey, lastLife);
        let negativeHit = await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        expect(negativeHit.newValue, 'Allowed below zero').toBe(lastLife - hitDamage);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let targetPlayer = await CombatSkillCasting.placeSecondPlayer(secondPage, context);
        let targetName = targetPlayer.playerName;
        await GameplayE2eStateApi.setPlayerStats(gameConfig, context.roomName, targetName, {hp: 0});
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {allowEffectBelowZero: false});
        await CombatSkillCasting.targetPlayer(page, targetPlayer.sessionId);
        await CombatSkillCasting.clickWhenReady(page, context, attackShort);
        let endState = await CombatSkillCasting.waitForEndStates(context, attackShort, 2);
        expect(endState.lastState, 'The damage is not applied').toBe(SkillConst.SKILL_STATES.APPLYING_DAMAGE);
        expect((await CombatSkillCasting.fetchRecorded(context)).damages.length, 'No damage on zero').toBe(1);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, targetName)).stats.hp,
            'The target stays on zero'
        ).toBe(0);
        await screenshots.capture(page, 'effect-below-zero-refused');
    }

    static async moveAwayFromEnemy(page, context)
    {
        await CombatSkillCasting.placeByEnemy(
            page,
            context,
            RoomObjectsApi.placePlayerNextToObject,
            TestCombatDamageRules.FAR_TILES,
            'The player must be placed away from the enemy'
        );
    }

    static async runRangeTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatDamageRules.ATTACK_SHORT;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {criticalChance: 0});
        await TestCombatDamageRules.moveAwayFromEnemy(page, context);
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await CombatSkillCasting.clickWhenReady(page, context, attackShort);
        await CombatSkillCasting.expectNothingApplied(
            page,
            context,
            0,
            TestCombatDamageRules.NOTHING_APPLIED_WAIT_MS,
            'The stored range must reject the far target'
        );
        expect((await CombatSkillCasting.fetchSkill(context, attackShort)).uses, 'Rejected before the cast').toBe(0);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'No damage').toBe(lifeBefore);
        await screenshots.capture(page, 'far-target-rejected');
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            range: TestCombatDamageRules.ANY_DISTANCE
        });
        let farHit = await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'Range 0 reaches it').toBe(lifeBefore - farHit.damage);
    }

    static async runCastEndRange(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatDamageRules.ATTACK_SHORT;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, {
            criticalChance: 0,
            castTime: TestCombatDamageRules.LONG_CAST_TIME_MS
        });
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await CombatSkillCasting.startCast(page, context, attackShort);
        await TestCombatDamageRules.moveAwayFromEnemy(page, context);
        let endState = await CombatSkillCasting.waitForEndStates(context, attackShort, 1);
        expect(endState.lastState, 'Out of range when the cast ends').toBe(SkillConst.SKILL_STATES.OUT_OF_RANGE);
        expect((await CombatSkillCasting.fetchRecorded(context)).damages, 'No damage').toEqual([]);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'No damage applied').toBe(lifeBefore);
        await screenshots.capture(page, 'out-of-range-on-cast-end');
    }

    static run()
    {
        test.describe('Combat Damage Rules', () => {
            test('damage follows the attack and defense difference and the direct damage ignores it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageRules.runAttackDefenseTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('damage below zero allowed on an enemy and refused on a target already on zero', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageRules.runBelowZero(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('range 0 reaches a far target that the stored range rejects', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageRules.runRangeTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('target out of range when the cast time ends takes no damage', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatDamageRules.runCastEndRange(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatDamageRules.run();
