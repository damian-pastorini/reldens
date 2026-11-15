/**
 *
 * Reldens - Test Class Paths Importer
 *
 * Tests the ClassPathsImporter (the npx reldens-import class-paths command) against the test database: a class path is
 * imported with its own new levels set, the levels of that set with the experience per level of the import data and
 * one level label per class path level (the labels are linked to the levels of another levels set, ISSUE #406, so the
 * label levels are not checked); and the AttributesPerLevelImporter (npx reldens-import attributes-per-level) adds the
 * stats and stats base modifiers of a stat to the level of that class path levels set. The imported class path, its
 * levels with their modifiers, labels and levels set are deleted after the test.
 *
 */

const { BaseTest } = require('./base-test');
const { Utils } = require('./utils');
const { ClassPathsImporter } = require('../lib/import/server/class-paths-importer');
const { AttributesPerLevelImporter } = require('../lib/import/server/attributes-per-level-importer');
const { ClassPathKeyFactory } = require('../lib/actions/factories/class-path-key-factory');
const { sc } = require('@reldens/utils');

class TestClassPathsImporter extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.isIntegration = true;
        this.classPathLabel = 'Import Probe Path';
    }

    async deleteImportedClassPath(dataServer)
    {
        let classPath = await dataServer.getEntity('skillsClassPath').loadOneBy(
            'key',
            ClassPathKeyFactory.fromLabel(this.classPathLabel)
        );
        if(!classPath){
            return false;
        }
        await dataServer.getEntity('skillsClassPathLevelLabels').delete({class_path_id: classPath.id});
        await dataServer.getEntity('skillsClassPath').deleteById(classPath.id);
        for(let level of await dataServer.getEntity('skillsLevels').loadBy('level_set_id', classPath.levels_set_id)){
            await dataServer.getEntity('skillsLevelsModifiers').delete({level_id: level.id});
        }
        await dataServer.getEntity('skillsLevels').delete({level_set_id: classPath.levels_set_id});
        await dataServer.getEntity('skillsLevelsSet').deleteById(classPath.levels_set_id);
        return true;
    }

    async testTheClassPathIsImportedWithItsLevelsSetAndExperience()
    {
        await this.test('a class path is imported with its own levels set and the experience per level', async () => {
            let dataServer = Utils.createDataServer(this.config);
            await dataServer.connect();
            dataServer.generateEntities();
            await this.deleteImportedClassPath(dataServer);
            let failure = false;
            let stored = {};
            let levelsData = {'1': {req: 0}, '2': {req: 100}};
            try {
                stored.imported = await new ClassPathsImporter({dataServer}).import({
                    classPaths: {[this.classPathLabel]: {'1': 'Import Novice', '2': 'Import Adept'}},
                    levelsSets: {all: levelsData}
                });
                stored.classPath = await dataServer.getEntity('skillsClassPath').loadOneBy(
                    'key',
                    ClassPathKeyFactory.fromLabel(this.classPathLabel)
                );
                stored.levels = (await dataServer.getEntity('skillsLevels').loadBy(
                    'level_set_id',
                    stored.classPath.levels_set_id
                )).map(level => [String(level.key), Number(level.required_experience)]);
                stored.labels = (await dataServer.getEntity('skillsClassPathLevelLabels').loadBy(
                    'class_path_id',
                    stored.classPath.id
                )).map(label => label.label);
                stored.attributesImported = await new AttributesPerLevelImporter({dataServer}).import({
                    statsByVariation: {player: {'1': {[this.classPathLabel]: {hp: 10}}}}
                });
                let firstLevel = await dataServer.getEntity('skillsLevels').loadOne({
                    key: 1,
                    level_set_id: stored.classPath.levels_set_id
                });
                stored.modifiers = (await dataServer.getEntity('skillsLevelsModifiers').loadBy(
                    'level_id',
                    firstLevel.id
                )).map(modifier => [modifier.key, modifier.property_key, String(modifier.value)]);
            } catch(error) {
                failure = error;
            }
            await this.deleteImportedClassPath(dataServer);
            await dataServer.disconnect();
            if(failure){
                throw failure;
            }
            this.assert.deepStrictEqual(
                [stored.imported, stored.classPath.label, stored.levels, stored.labels],
                [
                    true,
                    this.classPathLabel,
                    Object.keys(levelsData).map(levelKey => [levelKey, levelsData[levelKey].req]),
                    ['Import Novice', 'Import Adept']
                ],
                'Imported class path: '+sc.toJsonString(stored)
            );
            this.assert.deepStrictEqual(
                [stored.attributesImported, stored.modifiers],
                [true, [['inc_hp', 'stats/hp', '10'], ['inc_hp', 'statsBase/hp', '10']]],
                'The attributes per level import adds the stat modifiers to the class path level'
            );
        });
    }

}

module.exports.TestClassPathsImporter = TestClassPathsImporter;
