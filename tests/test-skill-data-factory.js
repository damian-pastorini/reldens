/**
 *
 * Reldens - Test Skill Data Factory
 *
 * The skills import data mapping of the admin skills import sample (theme/admin/js/skills-sample-data-import.js): the
 * type data is merged over the defaults block named like the type, the attack entry of the skill properties becomes
 * the skill attack data (the physical attack "throwRock" carries its own), the physical data is merged over its
 * defaults and the stored skill row keeps only the skill columns.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { SkillDataFactory } = require('../lib/actions/factories/skill-data-factory');
const { sc } = require('@reldens/utils');

class TestSkillDataFactory extends BaseTest
{

    loadSampleData()
    {
        let sampleData = AdminBrowserScriptLoader.loadSkillsSampleData();
        Object.assign(sampleData.defaults, {classPaths: {}, targetOptions: {player: {id: 2}}});
        return sampleData;
    }

    mapSampleSkill(skillKey)
    {
        let sampleData = this.loadSampleData();
        let skillData = new SkillDataFactory();
        skillData.mapData(skillKey, sampleData.skills[skillKey], sampleData.defaults);
        return skillData;
    }

    async testTheAttackTypeDataIsMergedOverTheAttackDefaults()
    {
        await this.test('the attack type data is merged over the defaults block named like the type', async () => {
            this.assert.deepStrictEqual(
                this.mapSampleSkill('punch').attack,
                Object.assign({}, this.loadSampleData().defaults.attack, {hitDamage: 3})
            );
        });
    }

    async testThePhysicalAttackPropertiesAttackIsItsAttackData()
    {
        await this.test('the physical attack attack entry of its properties is its attack data', async () => {
            this.assert.deepStrictEqual(
                this.mapSampleSkill('throwRock').attack,
                Object.assign({}, this.loadSampleData().defaults.attack, {hitDamage: 5})
            );
        });
    }

    async testThePhysicalAttackKeepsItsPhysicalData()
    {
        await this.test('the physical attack physical data is merged with the physical data defaults', async () => {
            this.assert.deepStrictEqual(
                this.mapSampleSkill('throwRock').physicalData,
                {magnitude: 350, objectWidth: 5, objectHeight: 5, validateTargetOnHit: 0}
            );
        });
    }

    async testTheEffectHasNoAttackData()
    {
        await this.test('the effect without a type defaults block or properties has an empty type data and no attack data', async () => {
            let skillData = this.mapSampleSkill('heal');
            this.assert.deepStrictEqual([skillData.effect, skillData.attack], [{}, null]);
        });
    }

    async testTheStoredSkillRowHasNoAttackData()
    {
        await this.test('the stored skill row only has the skill columns', async () => {
            let baseData = this.mapSampleSkill('throwRock').skillBaseData();
            this.assert.deepStrictEqual(
                [sc.hasOwn(baseData, 'attack'), baseData.key, baseData.range],
                [false, 'throwRock', 250]
            );
        });
    }

}

module.exports.TestSkillDataFactory = TestSkillDataFactory;
