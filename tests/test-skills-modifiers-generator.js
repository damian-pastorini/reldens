/**
 *
 * Reldens - Test Skills Modifiers Generator
 *
 */

const { BaseTest } = require('./base-test');
const { ModifiersGenerator } = require('../lib/actions/server/storage/modifiers-generator');
const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class TestSkillsModifiersGenerator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.costModel = {key: 'dec_mp', property_key: 'stats/mp', operation: ModifierConst.OPS.DEC, value: '2'};
        this.healModel = {key: 'heal', property_key: 'stats/hp', operation: ModifierConst.OPS.INC, value: '10'};
    }

    async testTheStoredLimitsAreGivenAsNumbers()
    {
        await this.test('the stored numeric limits are numbers and the blank, invalid and zero maximum ones no limit', async () => {
            let cases = [
                {minValue: '0', maxValue: ' ', expected: [0, false]},
                {minValue: '5', maxValue: '50', expected: [5, 50]},
                {minValue: '', maxValue: '0', expected: [false, false]},
                {minValue: null, maxValue: 'abc', expected: [false, false]},
                {minValue: ' -3 ', maxValue: '-1', expected: [-3, -1]}
            ];
            for(let limitsCase of cases){
                let modifier = ModifiersGenerator.fromModifiersModels([
                    Object.assign({}, this.costModel, {minValue: limitsCase.minValue, maxValue: limitsCase.maxValue})
                ]).shift();
                this.assert.deepStrictEqual(
                    [modifier.minValue, modifier.maxValue],
                    limitsCase.expected,
                    'Limits '+sc.toJsonString([limitsCase.minValue, limitsCase.maxValue])
                );
            }
        });
    }

    async testACostStopsAtTheStoredMinimum()
    {
        await this.test('a skill cost of the sample owner effect stops at its stored minimum value 0', async () => {
            let owner = {stats: {mp: 1}};
            ModifiersGenerator.fromModifiersModels([
                Object.assign({}, this.costModel, {minValue: '0', maxValue: '', maxProperty: null})
            ]).shift().apply(owner);
            this.assert.strictEqual(owner.stats.mp, 0);
        });
    }

    async testAHealWithAZeroMaximumUsesItsMaximumProperty()
    {
        await this.test('the sample heal with the stored maximum value 0 heals up to its maximum property', async () => {
            let healModel = Object.assign({}, this.healModel, {minValue: '0', maxValue: '0', maxProperty: 'statsBase/hp'});
            for(let healCase of [{hp: 1, expectedHp: 11}, {hp: 95, expectedHp: 100}]){
                let target = {stats: {hp: healCase.hp}, statsBase: {hp: 100}};
                ModifiersGenerator.fromModifiersModels([healModel]).shift().apply(target);
                this.assert.strictEqual(target.stats.hp, healCase.expectedHp, 'Heal from '+healCase.hp);
            }
        });
    }

    async testNoModelsGiveNoModifiers()
    {
        await this.test('no stored effects give no modifiers', async () => {
            for(let modifiersModels of [[], false, null]){
                this.assert.deepStrictEqual(ModifiersGenerator.fromModifiersModels(modifiersModels), []);
            }
        });
    }

}

module.exports.TestSkillsModifiersGenerator = TestSkillsModifiersGenerator;
