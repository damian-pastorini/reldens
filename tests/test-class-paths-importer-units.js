/**
 *
 * Reldens - Test Class Paths Importer Units
 *
 * Tests the PlayersExperiencePerLevelImporter and the ClassPathsImporter with recording repositories: the experience
 * import refuses data that is not an object, creates a levels set only when none is given (and fails when it can not be
 * created) and imports a level whose required experience is not a number with zero; the class paths import gives every
 * class path its own levels set from the levels data of its label (or the levels data for all), loads the level of
 * each label from that set by its key to link it, skips a label of a missing level and a class path that could not be
 * created.
 *
 */

const { BaseTest } = require('./base-test');
const { ClassPathsImporter } = require('../lib/import/server/class-paths-importer');
const { PlayersExperiencePerLevelImporter } = require('../lib/import/server/players-experience-per-level-importer');

class TestClassPathsImporterUnits extends BaseTest
{

    createRepository(storage, entityKey, isFailing)
    {
        return {
            create: async (row) => {
                if(isFailing){
                    return false;
                }
                let createdRow = Object.assign({id: storage[entityKey].length + 1}, row);
                storage[entityKey].push(createdRow);
                return createdRow;
            },
            loadOne: async (filters) => {
                storage.loadedSets.push([filters.level_set_id, filters.key]);
                return storage[entityKey].find(row => filters.level_set_id === row.level_set_id && filters.key === row.key);
            }
        };
    }

    createDataServer(storage, failedEntities = [])
    {
        let repositories = {};
        storage.loadedSets = [];
        for(let entityKey of ['skillsLevels', 'skillsLevelsSet', 'skillsClassPath', 'skillsClassPathLevelLabels']){
            storage[entityKey] = [];
            repositories[entityKey] = this.createRepository(storage, entityKey, -1 !== failedEntities.indexOf(entityKey));
        }
        return {getEntity: (entityKey) => repositories[entityKey]};
    }

    async testTheExperienceImportCreatesOnlyValidLevels()
    {
        await this.test('the experience import refuses invalid data, creates a set only when none is given and imports a not number requirement as zero', async () => {
            let storage = {};
            let importer = new PlayersExperiencePerLevelImporter({dataServer: this.createDataServer(storage)});
            let results = [
                await importer.import(false),
                await importer.import('levels'),
                await importer.import({'1': {req: 0}, '2': {req: 'many'}, '3': {}, '4': {req: 40}}),
                await importer.import({'5': {req: 90}}, 7)
            ];
            let failedSetStorage = {};
            let failedSetImporter = new PlayersExperiencePerLevelImporter({
                dataServer: this.createDataServer(failedSetStorage, ['skillsLevelsSet'])
            });
            results.push(await failedSetImporter.import({'1': {req: 0}}));
            this.assert.deepStrictEqual(
                [
                    results,
                    storage.skillsLevelsSet.length,
                    storage.skillsLevels.map(level => [level.key, level.required_experience, level.level_set_id]),
                    failedSetStorage.skillsLevels
                ],
                [
                    [false, false, 1, 7, false],
                    1,
                    [['1', 0, 1], ['2', 0, 1], ['3', 0, 1], ['4', 40, 1], ['5', 90, 7]],
                    []
                ]
            );
        });
    }

    async testEveryClassPathGetsTheLevelsOfItsLabel()
    {
        await this.test('every class path gets its own levels set from its label levels and links the labels of its levels', async () => {
            let storage = {};
            let imported = await new ClassPathsImporter({dataServer: this.createDataServer(storage)}).import({
                classPaths: {'Warrior': {'1': 'Novice', '2': 'Adept'}, 'Mage': {'1': 'Apprentice', '9': 'Missing'}},
                levelsSets: {all: {'1': {req: 0}}, 'Warrior': {'1': {req: 0}, '2': {req: 100}}}
            });
            this.assert.deepStrictEqual(
                [
                    imported,
                    storage.skillsClassPath.map(classPath => [classPath.label, classPath.levels_set_id, classPath.enabled]),
                    storage.skillsLevels.map(level => [level.key, level.level_set_id]),
                    storage.skillsClassPathLevelLabels.map(label => [label.class_path_id, label.label, label.level_id]),
                    storage.loadedSets
                ],
                [
                    true,
                    [['Warrior', 1, 1], ['Mage', 2, 1]],
                    [['1', 1], ['2', 1], ['1', 2]],
                    [[1, 'Novice', 1], [1, 'Adept', 2], [2, 'Apprentice', 3]],
                    [[1, '1'], [1, '2'], [2, '1'], [2, '9']]
                ]
            );
        });
    }

    async testAClassPathThatCanNotBeCreatedIsSkipped()
    {
        await this.test('a class path that could not be created is skipped and gets no level labels', async () => {
            let storage = {};
            let imported = await new ClassPathsImporter({
                dataServer: this.createDataServer(storage, ['skillsClassPath'])
            }).import({classPaths: {'Warrior': {'1': 'Novice'}}, levelsSets: {all: {'1': {req: 0}}}});
            this.assert.deepStrictEqual(
                [imported, storage.skillsClassPath, storage.skillsClassPathLevelLabels, storage.loadedSets],
                [true, [], [], []]
            );
        });
    }

}

module.exports.TestClassPathsImporterUnits = TestClassPathsImporterUnits;
