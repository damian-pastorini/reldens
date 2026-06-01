/**
 *
 * Reldens - Game Data Skills Helper
 *
 * Classifies player skill data by type (attack, effect) for use in the combat spec.
 *
 */

class GameDataSkills
{
    static SKILL_TYPE_ATTACK = 2;
    static SKILL_TYPE_EFFECT = 3;
    static SKILL_TYPE_PHYSICAL_ATTACK = 4;
    static SKILL_TYPE_PHYSICAL_EFFECT = 5;
    static ATTACK_TYPES = [GameDataSkills.SKILL_TYPE_ATTACK, GameDataSkills.SKILL_TYPE_PHYSICAL_ATTACK];

    static buildSkillEntryFromModel(skillModel)
    {
        let type = Number(skillModel.type) || 0;
        return {
            key: skillModel.key,
            label: skillModel.label || skillModel.key,
            type: type,
            range: Number(skillModel.range) || 0,
            hasAttackData: GameDataSkills.ATTACK_TYPES.indexOf(type) !== -1
        };
    }

    static classifySkillEntries(skillEntries)
    {
        let buckets = { attack: [], effect: [], physicalAttack: [], physicalEffect: [] };
        for(let entry of skillEntries) {
            if(GameDataSkills.SKILL_TYPE_ATTACK === entry.type) {
                buckets.attack.push(entry);
            }
            if(GameDataSkills.SKILL_TYPE_EFFECT === entry.type) {
                buckets.effect.push(entry);
            }
            if(GameDataSkills.SKILL_TYPE_PHYSICAL_ATTACK === entry.type) {
                buckets.physicalAttack.push(entry);
            }
            if(GameDataSkills.SKILL_TYPE_PHYSICAL_EFFECT === entry.type) {
                buckets.physicalEffect.push(entry);
            }
        }
        return buckets;
    }

    static resolvePlayerSkillsForClassPath(configManager, classPathId, currentLevel)
    {
        let classPathsContainer = configManager.skills && configManager.skills.classPaths;
        if(!classPathsContainer || !classPathsContainer.classPathsById) {
            return [];
        }
        let classPathEntry = classPathsContainer.classPathsById[classPathId];
        if(!classPathEntry || !classPathEntry.data) {
            return [];
        }
        let levelSkills = classPathEntry.data.related_skills_class_path_level_skills;
        if(!levelSkills || 0 === levelSkills.length) {
            return [];
        }
        let levelLimit = Number(currentLevel) || 0;
        let seenKeys = {};
        let result = [];
        for(let levelSkill of levelSkills) {
            let levelInfo = levelSkill.related_skills_levels;
            let skillModel = levelSkill.related_skills_skill;
            if(!skillModel) {
                continue;
            }
            let levelKey = levelInfo ? Number(levelInfo.key) : 1;
            if(levelKey > levelLimit) {
                continue;
            }
            if(seenKeys[skillModel.key]) {
                continue;
            }
            seenKeys[skillModel.key] = true;
            result.push(GameDataSkills.buildSkillEntryFromModel(skillModel));
        }
        return result;
    }
}

module.exports.GameDataSkills = GameDataSkills;
