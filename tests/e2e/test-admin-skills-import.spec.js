/**
 *
 * Reldens - Test Admin Skills Import
 *
 * Tests the administration Skills Import page on the running server: the sample data set by its button and imported
 * stores the physical attack throwRock with its type, its attack data and its physical data (ISSUE #375), and once
 * the stored skills are reloaded like a restart the imported throwRock (no critical hit, the stamina of the player and
 * the enemy balanced too, its attack also reads it) hits a forest enemy with its stored hit damage; an
 * import with
 * update of a skill with more than one animation changes only the changed animation and keeps the other one on its row
 * (ISSUE #380); and an import with override deletes the existent skill and creates it again with the new data (ISSUE
 * #379). The update and override cases import the sample skills with their keys prefixed, so no sample skill changes,
 * and every skills table the import writes is preserved and restored after each test, the relations before the skills.
 * A class path imported with the class-paths and attributes-per-level importers (ISSUE #406, the "Player Base" path,
 * its key the player-base sprite of the theme, its own levels set with 100 experience for level 2, a label per level
 * and 10 hp on level 2) and loaded like a restart is picked by a new player on the creation form, which starts on the
 * imported level 1 label and next level experience and, with that experience added, reaches level 2 with its label and
 * its hp raised by the imported attribute.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AdminPanelSession } = require('./helpers/admin-panel-session');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { SecurityApi } = require('./helpers/security-api');
const { CharacterCreation } = require('./helpers/character-creation');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { Login } = require('./helpers/login');
const { ClassPathKeyFactory } = require('../../lib/actions/factories/class-path-key-factory');
const { AdminBrowserScriptLoader } = require('../fixtures/admin-browser-script-loader');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdminSkillsImport
{

    static KEY_PREFIX = 'e2eImport';
    static BALANCED_STAMINA = {stamina: 50};
    static SAMPLE_BUTTON = '.skills-import .set-sample-data';
    static GENERATOR_DATA = '.skills-import .generatorData';
    static IMPORT_SUBMIT = '.skills-import .button-skills-import';
    static UPDATE_OPTIONS = {removeAll: false, override: false, update: true};
    static OVERRIDE_OPTIONS = {removeAll: false, override: true, update: false};
    static PRESERVED_ENTITIES = [
        'skillsSkillAnimations',
        'skillsSkillOwnerConditions',
        'skillsSkillOwnerEffects',
        'skillsSkillTargetEffects',
        'skillsSkillAttack',
        'skillsSkillPhysicalData',
        'skillsClassPathLevelSkills',
        'objectsSkills',
        'skillsSkill'
    ];
    static CLASS_PATHS_ENTITIES = [
        'skillsOwnersClassPath',
        'skillsLevelsModifiers',
        'skillsClassPathLevelLabels',
        'skillsClassPath',
        'skillsLevels',
        'skillsLevelsSet'
    ];
    static IMPORTED_CLASS_PATH = 'Player Base';
    static IMPORTED_LEVEL_LABELS = {'1': 'E2e Novice', '2': 'E2e Adept'};
    static IMPORTED_LEVELS = {'1': {req: 0}, '2': {req: 100}};
    static IMPORTED_HP = 10;

    static async preserveSkillsTables(gameConfig, e2eGroup, entitiesKeys = TestAdminSkillsImport.PRESERVED_ENTITIES)
    {
        for(let entityKey of entitiesKeys){
            await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, entityKey, {});
        }
    }

    static async openImportPage(page, gameConfig, longRun)
    {
        await page.goto(AdminPanelSession.adminPath(gameConfig)+'/skills-import');
        await expect(page.locator(TestAdminSkillsImport.GENERATOR_DATA)).toBeVisible(
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
    }

    static async submitImport(page, longRun)
    {
        let importResponse = page.waitForResponse(
            (response) => 'POST' === response.request().method() && response.url().includes('/skills-import'),
            {timeout: TimeConstants.forLongRun(TimeConstants.SERVER_RESPONSE, longRun)}
        );
        await page.click(TestAdminSkillsImport.IMPORT_SUBMIT);
        await page.locator(Selectors.admin.dialogConfirm).filter({visible: true}).click();
        let redirectLocation = sc.get((await importResponse).headers(), 'location', '');
        expect(
            new URL(redirectLocation, page.url()).searchParams.get('result'),
            'The skills import result of the redirect '+redirectLocation
        ).toBe('success');
    }

    static createPrefixedData(options)
    {
        let sampleData = AdminBrowserScriptLoader.loadSkillsSampleData();
        let skills = {};
        for(let skillKey of Object.keys(sampleData.skills)){
            skills[TestAdminSkillsImport.KEY_PREFIX+skillKey] = sampleData.skills[skillKey];
        }
        return Object.assign(sampleData, {options, skills});
    }

    static async importData(page, gameConfig, longRun, importData)
    {
        await TestAdminSkillsImport.openImportPage(page, gameConfig, longRun);
        await page.locator(TestAdminSkillsImport.GENERATOR_DATA).fill(sc.toJsonString(importData));
        await TestAdminSkillsImport.submitImport(page, longRun);
    }

    static async loadSkill(gameConfig, skillKey)
    {
        let skillRows = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkill', {key: skillKey});
        expect(skillRows, 'One stored skill '+skillKey).toHaveLength(1);
        return skillRows.shift();
    }

    static async importPrefixedSample(page, gameConfig, e2eGroup, longRun, skillKey)
    {
        await TestAdminSkillsImport.preserveSkillsTables(gameConfig, e2eGroup);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await TestAdminSkillsImport.importData(
            page,
            gameConfig,
            longRun,
            TestAdminSkillsImport.createPrefixedData(TestAdminSkillsImport.UPDATE_OPTIONS)
        );
        return await TestAdminSkillsImport.loadSkill(gameConfig, TestAdminSkillsImport.KEY_PREFIX+skillKey);
    }

    static async importSampleData(page, gameConfig, e2eGroup, longRun)
    {
        await TestAdminSkillsImport.preserveSkillsTables(gameConfig, e2eGroup);
        await AdminPanelSession.loginAsAdmin(page, gameConfig, longRun);
        await TestAdminSkillsImport.openImportPage(page, gameConfig, longRun);
        await page.click(TestAdminSkillsImport.SAMPLE_BUTTON);
        await expect(page.locator(TestAdminSkillsImport.GENERATOR_DATA), 'The sample data is set').not.toHaveValue('');
        await TestAdminSkillsImport.submitImport(page, longRun);
    }

    static async runImportedThrowRockHitTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await TestAdminSkillsImport.importSampleData(page, gameConfig, e2eGroup, longRun);
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/reload-skills', {group: e2eGroup});
        let combat = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let throwRock = await TestAdminSkillsImport.loadSkill(gameConfig, 'throwRock');
        let attack = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillAttack', {skill_id: throwRock.id})]
            .shift();
        await CombatSkillCasting.setPlayerStats(combat, TestAdminSkillsImport.BALANCED_STAMINA);
        await CombatSkillCasting.setEnemyStats(combat, TestAdminSkillsImport.BALANCED_STAMINA);
        await CombatSkillCasting.changeSkill(combat, e2eGroup, throwRock.key, {criticalChance: 0});
        let hit = await CombatSkillCasting.castSkill(page, combat, throwRock.key, 1);
        await screenshots.capture(page, 'skills-import-throw-rock-hit');
        expect(hit.damage, 'The imported throwRock hits the enemy with its stored hit damage').toBe(Number(attack.hitDamage));
    }

    static async runSampleImportTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        await TestAdminSkillsImport.importSampleData(page, gameConfig, e2eGroup, longRun);
        await screenshots.capture(page, 'skills-import-sample-success');
        let throwRock = await TestAdminSkillsImport.loadSkill(gameConfig, 'throwRock');
        let physicalAttackType = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillType', {
            key: 'physical_attack'
        })].shift();
        let skillFilter = {skill_id: throwRock.id};
        let attack = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillAttack', skillFilter)].shift();
        let physicalData = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillPhysicalData', skillFilter)]
            .shift();
        expect({
            type: String(throwRock.type),
            attack: [attack.affectedProperty, attack.hitDamage],
            physicalData: [physicalData.magnitude, physicalData.objectWidth, physicalData.objectHeight]
        }, 'The imported throwRock type, attack and physical data').toEqual({
            type: String(physicalAttackType.id),
            attack: ['stats/hp', 5],
            physicalData: [350, 5, 5]
        });
    }

    static mapAnimations(animationRows)
    {
        return animationRows.map((row) => {
            let animationData = sc.toJson(row.animationData, {});
            return [row.id, row.key, animationData.img, animationData.end];
        }).sort((rowA, rowB) => rowA[1].localeCompare(rowB[1]));
    }

    static async runUpdateAnimationTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let healKey = TestAdminSkillsImport.KEY_PREFIX+'heal';
        let heal = await TestAdminSkillsImport.importPrefixedSample(page, gameConfig, e2eGroup, longRun, 'heal');
        let animationsFilter = {skill_id: heal.id};
        let importedAnimations = TestAdminSkillsImport.mapAnimations(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillAnimations', animationsFilter)
        );
        let changedData = TestAdminSkillsImport.createPrefixedData(TestAdminSkillsImport.UPDATE_OPTIONS);
        changedData.skills[healKey].animations.cast = {end: 5};
        await TestAdminSkillsImport.importData(page, gameConfig, longRun, changedData);
        await screenshots.capture(page, 'skills-import-update-animation-success');
        let updatedAnimations = TestAdminSkillsImport.mapAnimations(
            await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillAnimations', animationsFilter)
        );
        expect(
            [importedAnimations.map(row => row.slice(1)), updatedAnimations],
            'Only the changed cast animation is updated, on the same rows'
        ).toEqual([
            [['cast', healKey+'_cast', 3], ['hit', healKey+'_hit', 4]],
            [
                [importedAnimations[0][0], 'cast', healKey+'_cast', 5],
                [importedAnimations[1][0], 'hit', healKey+'_hit', 4]
            ]
        ]);
    }

    static async runOverrideTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let punchKey = TestAdminSkillsImport.KEY_PREFIX+'punch';
        let importedPunch = await TestAdminSkillsImport.importPrefixedSample(page, gameConfig, e2eGroup, longRun, 'punch');
        let changedData = TestAdminSkillsImport.createPrefixedData(TestAdminSkillsImport.OVERRIDE_OPTIONS);
        changedData.skills[punchKey].typeData.properties.hitDamage = 7;
        await TestAdminSkillsImport.importData(page, gameConfig, longRun, changedData);
        await screenshots.capture(page, 'skills-import-override-success');
        let overriddenPunch = await TestAdminSkillsImport.loadSkill(gameConfig, punchKey);
        let attack = [...await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'skillsSkillAttack',
            {skill_id: overriddenPunch.id}
        )].shift();
        let oldAttackRows = await E2eSeedAndRestoreApi.loadRows(
            gameConfig,
            'skillsSkillAttack',
            {skill_id: importedPunch.id}
        );
        expect(
            {isSameSkill: importedPunch.id === overriddenPunch.id, hitDamage: attack.hitDamage, oldAttackRows},
            'The overridden skill is created again with the new attack data'
        ).toEqual({isSameSkill: false, hitDamage: 7, oldAttackRows: []});
    }

    static async importClassPath(gameConfig, e2eGroup)
    {
        await TestAdminSkillsImport.preserveSkillsTables(gameConfig, e2eGroup, TestAdminSkillsImport.CLASS_PATHS_ENTITIES);
        let label = TestAdminSkillsImport.IMPORTED_CLASS_PATH;
        let imported = await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/import-class-paths', {
            classPaths: {
                classPaths: {[label]: TestAdminSkillsImport.IMPORTED_LEVEL_LABELS},
                levelsSets: {all: TestAdminSkillsImport.IMPORTED_LEVELS}
            },
            attributes: {statsByVariation: {player: {'2': {[label]: {hp: TestAdminSkillsImport.IMPORTED_HP}}}}}
        });
        expect(imported, 'The class path, its levels and its attributes per level are imported').toEqual(
            {classPathsImported: true, attributesImported: true}
        );
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/reload-skills', {group: e2eGroup});
        return await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'skillsClassPath', {
            key: ClassPathKeyFactory.fromLabel(label)
        });
    }

    static async runImportedClassPathPlayerTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let classPathId = await TestAdminSkillsImport.importClassPath(gameConfig, e2eGroup);
        let playerName = CharacterCreation.createPlayerName();
        await CharacterCreation.loginToCreation(page, gameConfig, longRun);
        await page.locator(CharacterCreation.CLASS_SELECT).selectOption(String(classPathId));
        await page.locator(CharacterCreation.CREATE_SCENE_SELECT).selectOption(Login.TOWN_ROOM_NAME);
        await CharacterCreation.submitCreateForm(page, playerName);
        await CharacterCreation.waitForGameStart(page, longRun);
        let created = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        let nextLevelExperience = TestAdminSkillsImport.IMPORTED_LEVELS['2'].req;
        await ItemGrowthSteps.addExperience(gameConfig, playerName, nextLevelExperience, Login.TOWN_ROOM_NAME);
        let leveled = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        await screenshots.capture(page, 'imported-class-path-player');
        expect(
            {
                created: [created.level, created.classPathLabel, created.nextLevelExperience],
                leveled: [leveled.level, leveled.classPathLabel, leveled.statsBase.hp - created.statsBase.hp]
            },
            'The new player starts on the imported level 1 and its experience reaches the imported level 2 and its hp'
        ).toEqual({
            created: [1, TestAdminSkillsImport.IMPORTED_LEVEL_LABELS['1'], nextLevelExperience],
            leveled: [2, TestAdminSkillsImport.IMPORTED_LEVEL_LABELS['2'], TestAdminSkillsImport.IMPORTED_HP]
        });
    }

    static run()
    {
        test.describe('Admin Skills Import', () => {
            test('a new player picks an imported class path and uses its levels, experience and attributes', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSkillsImport.runImportedClassPathPlayerTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('sample data imported from the Skills Import page stores throwRock with its type, attack and physical data', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSkillsImport.runSampleImportTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('the imported sample throwRock is loaded like a restart and hits an enemy with its stored damage', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSkillsImport.runImportedThrowRockHitTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('import with update changes only the changed animation of an existent skill', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSkillsImport.runUpdateAnimationTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('import with override deletes the existent skill and creates it again with the new data', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAdminSkillsImport.runOverrideTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestAdminSkillsImport.run();
