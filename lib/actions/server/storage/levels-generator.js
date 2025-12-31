/**
 *
 * Reldens - Skills - LevelsGenerator
 *
 * Generates level instances from database models.
 *
 */

const { Level } = require('@reldens/skills');
const { Modifier } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');

class LevelsGenerator
{

    /**
     * @param {Array} levelsModels
     * @returns {Object}
     */
    static fromLevelsModels(levelsModels)
    {
        let levels = {};
        for(let levelData of levelsModels){
            levelData.modifiers = this.extractModifiers(levelData['related_skills_levels_modifiers']);
            let levelKey = Number(levelData['key']);
            levelData.key = levelKey;
            levels[levelKey] = new Level(levelData);
        }
        return levels;
    }

    /**
     * @param {Array} modifiersModels
     * @returns {Array}
     */
    static extractModifiers(modifiersModels)
    {
        if(!sc.isArray(modifiersModels) || 0 === modifiersModels.length){
            return [];
        }
        let levelModifiers = [];
        for(let modifierData of modifiersModels){
            let modifier = new Modifier(modifierData);
            levelModifiers.push(modifier);
        }
        return levelModifiers;
    }

}

module.exports.LevelsGenerator = LevelsGenerator;
