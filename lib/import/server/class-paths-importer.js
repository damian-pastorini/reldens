
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
            await this.playersExperiencePerLevelImporter.import(
                data.levelsSets[label] || data.levelsSets.all,
                levelsSetModel.id
            );
            let key = label.toLowerCase().replace(/ /g, '-');
            let createdClassPath = classPathRepository.create({key, label, levels_set_id: levelsSetModel.id});
            await this.createSubClasses(createdClassPath.id, data, label, classPathRepository, levelsSetModel);
        }
    }

    async createSubClasses(classPathId, data, label)
    {
        let classLabelRepository = this.serverManager.dataServer.getEntity('classPathLevelLabels');
        let levelRepository = this.serverManager.dataServer.getEntity('level');
        let path = data.classPaths[label];
        let pathKeys = Object.keys(path);
        for(let pathKey of pathKeys){
            let level = levelRepository.load(path[pathKey]);
            classLabelRepository.create({class_path_id: classPathId, label: pathKey, level_id: level.id});
        }
    }
}

module.exports.ClassPathsImporter = ClassPathsImporter;
