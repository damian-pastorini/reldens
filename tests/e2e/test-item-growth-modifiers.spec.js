/**
 *
 * Reldens - Test Item Growth Modifiers
 *
 * Tests how the growing sword modifiers are scaled on a level up (ItemGrowthSteps, extra modifiers seeded on the sword
 * for the group before the login, the sword level reached with experience added to the player class path): every
 * scalable modifier of an equipped sword grows and every player stat follows its scaled value; the SET, SET_N and
 * METHOD modifiers are never scaled; a decimal modifier keeps its decimals; and an integer modifier scaled to a half is
 * rounded away from zero, for a positive and a negative value. The cases that only check the modifier values grow the
 * sword unequipped (requireEquipped false), so their modifiers are never applied on the player stats.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ModifierConst } = require('@reldens/modifiers');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthModifiers
{

    static PERCENT_KEY = 'modifiersIncreasePercentPerLevel';
    static REACHED_LEVEL = 2;
    static PERCENT_BASE = 100;
    static SCALING_CASES = [
        {
            title: 'SET, SET_N and METHOD modifiers are never scaled',
            isScaled: false,
            modifiers: [
                {key: 'e2e_growth_set', propertyKey: 'stats/dodge', operation: ModifierConst.OPS.SET, value: '12'},
                {key: 'e2e_growth_set_n', propertyKey: 'stats/speed', operation: ModifierConst.OPS.SET_N, value: '12'},
                {key: 'e2e_growth_method', propertyKey: 'stats/aim', operation: ModifierConst.OPS.METHOD, value: '12'}
            ]
        },
        {
            title: 'decimal modifier is scaled keeping its decimals',
            isScaled: true,
            modifiers: [{key: 'e2e_growth_decimal', propertyKey: 'stats/mAtk', operation: ModifierConst.OPS.INC, value: '2.5'}]
        },
        {
            title: 'integer modifier scaled to a half is rounded away from zero',
            isScaled: true,
            modifiers: [
                {key: 'e2e_growth_positive', propertyKey: 'stats/stamina', operation: ModifierConst.OPS.INC, value: '3'},
                {key: 'e2e_growth_negative', propertyKey: 'stats/aim', operation: ModifierConst.OPS.INC, value: '-3'}
            ]
        }
    ];

    static expectedValue(modifier, growth)
    {
        let value = Number(modifier.value);
        let scaled = value * (
            TestItemGrowthModifiers.PERCENT_BASE
            + (TestItemGrowthModifiers.REACHED_LEVEL - 1) * Number(growth[TestItemGrowthModifiers.PERCENT_KEY])
        ) / TestItemGrowthModifiers.PERCENT_BASE;
        if(Number.isInteger(value)){
            scaled = Math.sign(scaled) * Math.round(Math.abs(scaled));
        }
        return scaled;
    }

    static async growWithModifiers(context, seededModifiers, isEquipped)
    {
        await ItemGrowthSteps.seedItemModifiers(context, seededModifiers);
        let grown = await ItemGrowthSteps.startGrowth(context, isEquipped ? {} : {requireEquipped: false}, [], isEquipped);
        let reachedGrowth = {
            level: TestItemGrowthModifiers.REACHED_LEVEL,
            experience: Number(grown.growth.levels[String(TestItemGrowthModifiers.REACHED_LEVEL)])
        };
        grown.item = await ItemGrowthSteps.gainExperience(context, reachedGrowth.experience, reachedGrowth);
        return grown;
    }

    static async runScalingTest(context, scalingCase)
    {
        let grown = await TestItemGrowthModifiers.growWithModifiers(context, scalingCase.modifiers, false);
        expect(
            scalingCase.modifiers.map(modifier => grown.item.modifiers.find(itemModifier => modifier.key === itemModifier.key)?.value),
            'The modifiers values after the level up'
        ).toEqual(scalingCase.modifiers.map(
            modifier => scalingCase.isScaled
                ? TestItemGrowthModifiers.expectedValue(modifier, grown.growth)
                : Number(modifier.value)
        ));
    }

    static async runScalableModifiersTest(context)
    {
        let extraModifier = {key: 'e2e_growth_mdef', propertyKey: 'stats/mDef', operation: ModifierConst.OPS.INC, value: '4'};
        let grown = await TestItemGrowthModifiers.growWithModifiers(context, [extraModifier], true);
        let checkedModifiers = [
            {key: grown.itemData.modifierRow.key, propertyKey: grown.itemData.modifierRow.property_key, value: grown.itemData.modifierRow.value},
            extraModifier
        ];
        let expectedValues = checkedModifiers.map(modifier => TestItemGrowthModifiers.expectedValue(modifier, grown.growth));
        expect(
            checkedModifiers.map(modifier => grown.item.modifiers.find(itemModifier => modifier.key === itemModifier.key)?.value),
            'Every scalable modifier grows on the level up'
        ).toEqual(expectedValues);
        let statKeys = checkedModifiers.map(modifier => modifier.propertyKey.split('/').pop());
        let statsAfter = await ItemGrowthSteps.fetchPlayerStats(context.gameConfig);
        expect(statKeys.map(statKey => statsAfter[statKey]), 'Every stat follows its scaled modifier').toEqual(
            statKeys.map((statKey, index) => grown.statsBefore[statKey] + expectedValues[index] - Number(checkedModifiers[index].value))
        );
    }

    static run()
    {
        test.describe('Item Growth Modifiers', () => {
            test('every scalable modifier grows on the level up and the stats follow', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthModifiers.runScalableModifiersTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            for(let scalingCase of TestItemGrowthModifiers.SCALING_CASES){
                test(scalingCase.title, async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                    await TestItemGrowthModifiers.runScalingTest({page, screenshots, gameConfig, e2eGroup, longRun}, scalingCase);
                });
            }
        });
    }

}

TestItemGrowthModifiers.run();
