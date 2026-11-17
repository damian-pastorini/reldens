/**
 *
 * Reldens - Test Skills Importer
 *
 * Imports the admin skills import sample (theme/admin/js/skills-sample-data-import.js) into the test database, with its
 * skill keys prefixed so the stored sample skills never change, and checks the stored rows of every skill type: the
 * attack and the physical attack with their attack data, physical data, class path levels (selected by their position
 * in the class path levels set) and objects, and the effect with its conditions, effects and animations and no attack
 * data. It also checks the update of an existent skill and of its animations, the existent skill kept without update
 * or override, the override that creates the skill again, the skill of an unknown type not imported and the import
 * without skills refused. The imported skills are deleted after every test.
 *
 */

const { BaseTest } = require('./base-test');
const { Utils } = require('./utils');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { SkillsImporter } = require('../lib/import/server/skills-importer');
const { sc } = require('@reldens/utils');

class TestSkillsImporter extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.isIntegration = true;
        this.keyPrefix = 'importTest';
        this.updateOptions = {removeAll: false, override: false, update: true};
        this.storedRelations = {
            attack: ['skillsSkillAttack', 'loadOneBy'],
            physicalData: ['skillsSkillPhysicalData', 'loadOneBy'],
            ownerConditions: ['skillsSkillOwnerConditions', 'loadBy'],
            ownerEffects: ['skillsSkillOwnerEffects', 'loadBy'],
            targetEffects: ['skillsSkillTargetEffects', 'loadBy'],
            animations: ['skillsSkillAnimations', 'loadBy'],
            classPathLevels: ['skillsClassPathLevelSkills', 'loadBy'],
            objects: ['objectsSkills', 'loadBy']
        };
    }

    createSampleData(options)
    {
        let sampleData = AdminBrowserScriptLoader.loadSkillsSampleData();
        let skills = {};
        for(let skillKey of Object.keys(sampleData.skills)){
            skills[this.keyPrefix+skillKey] = sampleData.skills[skillKey];
        }
        return Object.assign(sampleData, {options, skills});
    }

    async runWithDataServer(callback)
    {
        let dataServer = Utils.createDataServer(this.config);
        await dataServer.connect();
        dataServer.generateEntities();
        let failure = false;
        try {
            await callback(dataServer);
        } catch(error) {
            failure = error;
        }
        await this.deleteImportedSkills(dataServer);
        await dataServer.disconnect();
        if(failure){
            throw failure;
        }
    }

    async deleteImportedSkills(dataServer)
    {
        let importedSkills = await dataServer.getEntity('skillsSkill').load({
            key: {operator: 'LIKE', value: this.keyPrefix}
        });
        for(let importedSkill of importedSkills){
            for(let relationKey of Object.keys(this.storedRelations)){
                await dataServer.getEntity(this.storedRelations[relationKey][0]).delete({skill_id: importedSkill.id});
            }
            await dataServer.getEntity('skillsSkill').deleteById(importedSkill.id);
        }
    }

    async loadStoredSkill(dataServer, sampleKey)
    {
        let stored = {skill: await dataServer.getEntity('skillsSkill').loadOneBy('key', this.keyPrefix+sampleKey)};
        for(let relationKey of Object.keys(this.storedRelations)){
            let [entityKey, loadMethod] = this.storedRelations[relationKey];
            stored[relationKey] = await dataServer.getEntity(entityKey)[loadMethod]('skill_id', stored.skill.id);
        }
        return stored;
    }

    async fetchClassPathLevels(dataServer, classPathKeys, levelPosition)
    {
        let classPathLevels = [];
        for(let classPath of await dataServer.getEntity('skillsClassPath').loadAll()){
            if(0 < classPathKeys.length && !classPathKeys.includes(classPath.key)){
                continue;
            }
            let levels = await dataServer.getEntity('skillsLevels').loadBy('level_set_id', classPath.levels_set_id);
            classPathLevels.push(classPath.id+'-'+levels[levelPosition].id);
        }
        return classPathLevels.sort();
    }

    async fetchSampleObjects(dataServer)
    {
        let playerTarget = await dataServer.getEntity('targetOptions').loadOneBy('target_key', 'player');
        let sampleObjects = [];
        for(let objectKey of ['enemy_1', 'enemy_2']){
            let sampleObject = await dataServer.getEntity('objects').loadOneBy('object_class_key', objectKey);
            sampleObjects.push(sampleObject.id+'-'+playerTarget.id);
        }
        return sampleObjects.sort();
    }

    mapStoredRelations(stored)
    {
        return {
            type: String(stored.skill.type),
            attack: stored.attack ? {
                affectedProperty: stored.attack.affectedProperty,
                hitDamage: stored.attack.hitDamage,
                attackProperties: stored.attack.attackProperties,
                defenseProperties: stored.attack.defenseProperties
            } : false,
            physicalData: stored.physicalData ? [
                stored.physicalData.magnitude,
                stored.physicalData.objectWidth,
                stored.physicalData.objectHeight,
                stored.physicalData.validateTargetOnHit
            ] : false,
            classPathLevels: stored.classPathLevels.map(row => row.class_path_id+'-'+row.level_id).sort(),
            objects: stored.objects.map(row => row.object_id+'-'+row.target_id).sort()
        };
    }

    createExpectedAttack(hitDamage)
    {
        return {
            affectedProperty: 'stats/hp',
            hitDamage,
            attackProperties: 'stats/atk,stats/stamina,stats/speed',
            defenseProperties: 'stats/def,stats/stamina,stats/speed'
        };
    }

    mapStoredAnimations(stored)
    {
        return stored.animations.map(row => {
            let animationData = sc.toJson(row.animationData, {});
            return [row.key, animationData.img, animationData.end];
        }).sort();
    }

    async testTheAttackSkillIsStoredWithItsRelations()
    {
        await this.test('the sample attack is stored with its type, attack data, class path levels and objects', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await new SkillsImporter({dataServer}).import(this.createSampleData(this.updateOptions));
                this.assert.deepStrictEqual(this.mapStoredRelations(await this.loadStoredSkill(dataServer, 'punch')), {
                    type: String((await dataServer.getEntity('skillsSkillType').loadOneBy('key', 'attack')).id),
                    attack: this.createExpectedAttack(3),
                    physicalData: false,
                    classPathLevels: await this.fetchClassPathLevels(dataServer, [], 1),
                    objects: await this.fetchSampleObjects(dataServer)
                });
            });
        });
    }

    async testThePhysicalAttackSkillIsStoredWithItsAttackAndPhysicalData()
    {
        await this.test('the sample physical attack is stored with its type, attack data and physical data', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await new SkillsImporter({dataServer}).import(this.createSampleData(this.updateOptions));
                this.assert.deepStrictEqual(this.mapStoredRelations(await this.loadStoredSkill(dataServer, 'throwRock')), {
                    type: String((await dataServer.getEntity('skillsSkillType').loadOneBy('key', 'physical_attack')).id),
                    attack: this.createExpectedAttack(5),
                    physicalData: [350, 5, 5, 0],
                    classPathLevels: await this.fetchClassPathLevels(dataServer, [], 2),
                    objects: await this.fetchSampleObjects(dataServer)
                });
            });
        });
    }

    async testTheEffectSkillIsStoredWithItsConditionsEffectsAndAnimations()
    {
        await this.test('the sample effect is stored with its conditions, effects and animations and no attack data', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await new SkillsImporter({dataServer}).import(this.createSampleData(this.updateOptions));
                let stored = await this.loadStoredSkill(dataServer, 'heal');
                this.assert.deepStrictEqual(
                    [
                        this.mapStoredRelations(stored),
                        stored.ownerConditions.map(row => [row.key, row.property_key, row.conditional, row.value]),
                        stored.ownerEffects.map(row => [row.key, row.property_key, row.operation, row.value]),
                        stored.targetEffects.map(row => [row.key, row.property_key, row.operation, row.value, row.maxProperty]),
                        this.mapStoredAnimations(stored)
                    ],
                    [
                        {
                            type: String((await dataServer.getEntity('skillsSkillType').loadOneBy('key', 'effect')).id),
                            attack: false,
                            physicalData: false,
                            classPathLevels: await this.fetchClassPathLevels(dataServer, ['sorcerer'], 3),
                            objects: []
                        },
                        [['available_mp', 'stats/mp', 'ge', '2']],
                        [['dec_mp', 'stats/mp', 2, '2']],
                        [['heal', 'stats/mp', 1, '5', 'statsBase/hp']],
                        [['cast', this.keyPrefix+'heal_cast', 3], ['hit', this.keyPrefix+'heal_hit', 4]]
                    ]
                );
            });
        });
    }

    async assertChangedPunchImport(dataServer, options, expected)
    {
        await new SkillsImporter({dataServer}).import(this.createSampleData(this.updateOptions));
        let importedSkill = await dataServer.getEntity('skillsSkill').loadOneBy('key', this.keyPrefix+'punch');
        let changedData = this.createSampleData(options);
        changedData.skills[this.keyPrefix+'punch'].typeData.properties.hitDamage = 7;
        await new SkillsImporter({dataServer}).import(changedData);
        let stored = await this.loadStoredSkill(dataServer, 'punch');
        this.assert.deepStrictEqual({
            isSameSkill: importedSkill.id === stored.skill.id,
            hitDamage: stored.attack ? stored.attack.hitDamage : false,
            skillRows: (await dataServer.getEntity('skillsSkill').loadBy('key', this.keyPrefix+'punch')).length
        }, expected);
    }

    async testTheUpdateChangesTheExistentSkill()
    {
        await this.test('an import with update changes the attack data of the existent skill', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await this.assertChangedPunchImport(
                    dataServer,
                    this.updateOptions,
                    {isSameSkill: true, hitDamage: 7, skillRows: 1}
                );
            });
        });
    }

    async testTheUpdateChangesTheExistentSkillAnimations()
    {
        await this.test('an import with update changes only the changed animation of the existent skill', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await new SkillsImporter({dataServer}).import(this.createSampleData(this.updateOptions));
                let changedData = this.createSampleData(this.updateOptions);
                changedData.skills[this.keyPrefix+'heal'].animations.cast = {end: 5};
                await new SkillsImporter({dataServer}).import(changedData);
                this.assert.deepStrictEqual(
                    this.mapStoredAnimations(await this.loadStoredSkill(dataServer, 'heal')),
                    [['cast', this.keyPrefix+'heal_cast', 5], ['hit', this.keyPrefix+'heal_hit', 4]]
                );
            });
        });
    }

    async testTheExistentSkillIsKeptWithoutUpdateOrOverride()
    {
        await this.test('an import without update or override keeps the existent skill as it is', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await this.assertChangedPunchImport(
                    dataServer,
                    {removeAll: false, override: false, update: false},
                    {isSameSkill: true, hitDamage: 3, skillRows: 1}
                );
            });
        });
    }

    async testTheOverrideCreatesTheSkillAgain()
    {
        await this.test('an import with override deletes the existent skill and creates it again', async () => {
            await this.runWithDataServer(async (dataServer) => {
                await this.assertChangedPunchImport(
                    dataServer,
                    {removeAll: false, override: true, update: false},
                    {isSameSkill: false, hitDamage: 7, skillRows: 1}
                );
            });
        });
    }

    async testAnUnknownTypeSkillIsNotImported()
    {
        await this.test('a skill of an unknown type is not imported and the other skills are', async () => {
            await this.runWithDataServer(async (dataServer) => {
                let sampleData = this.createSampleData(this.updateOptions);
                sampleData.skills[this.keyPrefix+'punch'].typeData.key = 'unknown_type';
                let importResult = await new SkillsImporter({dataServer}).import(sampleData);
                let skillsRepository = dataServer.getEntity('skillsSkill');
                this.assert.deepStrictEqual(
                    [
                        importResult,
                        Boolean(await skillsRepository.loadOneBy('key', this.keyPrefix+'punch')),
                        Boolean(await skillsRepository.loadOneBy('key', this.keyPrefix+'heal'))
                    ],
                    [true, false, true]
                );
            });
        });
    }

    async testAnImportWithoutSkillsIsRefused()
    {
        await this.test('an import without data or without skills is refused', async () => {
            await this.runWithDataServer(async (dataServer) => {
                let importer = new SkillsImporter({dataServer});
                this.assert.deepStrictEqual(
                    [await importer.import(false), await importer.import({options: this.updateOptions, skills: {}})],
                    [false, false]
                );
            });
        });
    }

}

module.exports.TestSkillsImporter = TestSkillsImporter;
