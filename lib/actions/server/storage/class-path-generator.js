/**
 *
 * Reldens - Skills - ClassPathGenerator
 *
 * Generates class path data structures from database models.
 *
 */

const { ClassPath } = require('@reldens/skills');
const { LevelsGenerator } = require('./levels-generator');
const { sc } = require('@reldens/utils');

class ClassPathGenerator
{

    /**
     * @param {Array} classPathModels
     * @param {Object} classPathClasses
     * @returns {Object}
     */
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
                classPathModel.related_skills_levels_set.related_skills_levels
            );
            classPathModel.labelsByLevel = this.extractLabelsByLevels(
                classPathModel.related_skills_class_path_level_labels
            );
            classPathsById[classPathModel.id] = classPathData;
            classPathsByKey[classPathModel.key] = classPathData;
        }
        return {classPathModels: activeClassPathModels, classPathsById, classPathsByKey};
    }

    /**
     * @param {Array} levelLabelsModel
     * @returns {Object}
     */
    static extractLabelsByLevels(levelLabelsModel)
    {
        if(!sc.isArray(levelLabelsModel) || 0 === levelLabelsModel.length){
            return {};
        }
        let labelsByLevel = {};
        for(let labelData of levelLabelsModel){
            labelsByLevel[labelData['related_skills_levels'].key] = labelData.label;
        }
        return labelsByLevel;
    }

}

module.exports.ClassPathGenerator = ClassPathGenerator;
