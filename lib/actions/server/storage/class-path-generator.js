/**
 *
 * Reldens - Skills - ClassPathGenerator
 *
 */

const { ClassPath } = require('@reldens/skills');
const { LevelsGenerator } = require('./levels-generator');
const { sc } = require('@reldens/utils');

class ClassPathGenerator
{

    static fromClassPathModels(classPathModels, classPathClasses)
    {
        if(!sc.isArray(classPathModels) || 0 === classPathModels.length){
            return {};
        }
        let classPathsById = {};
        let classPathsByKey = {};
        let activeClassPathModels = classPathModels.filter(classPathModel => classPathModel.enabled);
        for(let classPathModel of activeClassPathModels){
            let classPathData = {class: sc.get(classPathClasses, classPathModel.key, ClassPath), data: classPathModel};
            classPathModel.classPathLevels = LevelsGenerator.fromLevelsModels(
                classPathModel.skills_levels_set.skills_levels_set_levels
            );
            classPathModel.labelsByLevel = this.extractLabelsByLevels(classPathModel.skills_class_path_level_labels);
            classPathsById[classPathModel.id] = classPathData;
            classPathsByKey[classPathModel.key] = classPathData;
        }
        return {classPathModels: activeClassPathModels, classPathsById, classPathsByKey};
    }

    static extractLabelsByLevels(levelLabelsModel)
    {
        if(!sc.isArray(levelLabelsModel) || 0 === levelLabelsModel.length){
            return {};
        }
        let labelsByLevel = {};
        for(let labelData of levelLabelsModel){
            labelsByLevel[labelData['label_level'].key] = labelData.label;
        }
        return labelsByLevel;
    }

}

module.exports.ClassPathGenerator = ClassPathGenerator;
