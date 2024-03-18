/**
 *
 * Reldens - ClassPathsImporter
 *
 */

const { PlayersExperiencePerLevelImporter } = require('./players-experience-per-level-importer');
const { Logger } = require('@reldens/utils');

class ClassPathsImporter
{

    constructor(serverManager)
    {
        this.serverManager = serverManager;
        this.playersExperiencePerLevelImporter = new PlayersExperiencePerLevelImporter(serverManager);
    }

    async import(data)
    {
        if (!data) {
            Logger.critical('Import data not found.');
            return false;
        }
        if(!data.classPaths){
            Logger.critical('Class paths data not found.');
            return false;
        }
        if(!data.levelsSets){
            Logger.critical('Levels sets data not found.');
            return false;
        }
        this.preAppendRaceToAbilities(data);
        let levelSetsKeys = Object.keys(data.levelsSets);
        let levelsSetRepository = this.serverManager.dataServer.getEntity('levelsSet');
        let classPathRepository = this.serverManager.dataServer.getEntity('classPath');
        let pathsKeys = Object.keys(data.classPaths);
        for(let label of pathsKeys){
            let levelsSetModel = -1 === levelSetsKeys.indexOf(label) || data.levelsSets?.all
                ? await levelsSetRepository.create({autoFillRanges: 0})
                : await levelsSetRepository.load(data.levelsSets[label]);
            if(!levelsSetModel){
                Logger.critical('Levels set not found for label "'+label+'".');
                continue;
            }
            Logger.info('Created level set with ID "'+levelsSetModel.id+'".');
            await this.playersExperiencePerLevelImporter.import(
                data.levelsSets[label] || data.levelsSets.all,
                levelsSetModel.id
            );
            let key = label.toLowerCase().replace(/ /g, '-').replace('---', '-');
            let createdClassPath = await classPathRepository.create({key, label, levels_set_id: levelsSetModel.id});
            let classPathData = {key, label, levels_set_id: levelsSetModel.id};
            Logger.info('Created class path with ID "'+createdClassPath.id+'".', classPathData);
            await this.createSubClasses(createdClassPath.id, data, label);
        }
    }

    async createSubClasses(classPathId, data, label)
    {
        let classLabelRepository = this.serverManager.dataServer.getEntity('classPathLevelLabels');
        let levelRepository = this.serverManager.dataServer.getEntity('level');
        let path = data.classPaths[label];
        let pathKeys = Object.keys(path);
        for(let pathKey of pathKeys){
            let level = await levelRepository.loadOneBy('key', Number(pathKey));
            let classPathLabelData = {class_path_id: classPathId, label: path[pathKey], level_id: level.id};
            await classLabelRepository.create(classPathLabelData);
            Logger.info('Created class path label.', classPathLabelData);
        }
    }

    preAppendRaceToAbilities(data)
    {
        if(!data.classPaths){
            return false;
        }
        if(!data.preAppendRace){
            return false;
        }
        for (const classPath in data.classPaths) {
            const race = classPath.split(' - ')[0];
            const abilities = data.classPaths[classPath];
            for (const level in abilities) {
                abilities[level] = race + ' - ' + abilities[level];
            }
        }
        return data;
    }

}

module.exports.ClassPathsImporter = ClassPathsImporter;
