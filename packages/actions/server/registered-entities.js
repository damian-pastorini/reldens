/**
 *
 * Reldens - Registered Entities
 *
 */

const { SkillEntity } = require('./entities/skill-entity');
const { ClassPathEntity } = require('./entities/class-path-entity');
const { LevelEntity } = require('./entities/level-entity');
const { LevelsSetEntity } = require('./entities/levels-set-entity');
const { AnimationsEntity } = require('./entities/animations-entity');
const { LevelUpAnimationsEntity } = require('./entities/level-up-animations-entity');
const { ClassPathLevelLabelEntity } = require('./entities/class-path-level-label-entity');
const { ClassPathLevelSkillsEntity } = require('./entities/class-path-level-skills-entity');
const { LevelModifiersEntity } = require('./entities/level-modifiers-entity');
const { OwnersClassPathEntity } = require('./entities/owners-class-path-entity');
const { SkillAttackEntity } = require('./entities/skill-attack-entity');
const { SkillTargetEffectsEntity } = require('./entities/skill-target-effects-entity');
const { SkillPhysicalDataEntity } = require('./entities/skill-physical-data-entity');
const { SkillGroupRelationEntity } = require('./entities/skill-group-relation-entity');
const { SkillGroupsEntity } = require('./entities/skill-groups-entity');
const { SkillOwnerConditionsEntity } = require('./entities/skill-owner-conditions-entity');
const { SkillOwnerEffectsEntity } = require('./entities/skill-owner-effects-entity');
const { SkillAnimationsModel } = require('./models/skill-animations-model');
const { ClassLevelUpAnimationsModel } = require('./models/class-level-up-animations-model');
const SkillsPackModels = require('@reldens/skills/lib/server/storage/models/index');

let entitiesTranslations = {
    labels: {
        skills_levels: 'Levels',
        skills_class_path: 'Class Paths',
        skills_class_level_up_animations: 'Level Up Animations',
        skills_class_path_level_labels: 'Levels Labels',
        skills_levels_set: 'Levels Sets',
        skills_class_path_level_skills: 'Levels Skills',
        skills_levels_modifiers: 'Levels Modifiers',
        skills_owners_class_path: 'Players Class Path',
        skills_skill: 'Skills',
        skills_skill_animations: 'Animations',
        skills_skill_attack: 'Attack Properties',
        skills_skill_target_effects: 'Target Effects Properties',
        skills_skill_physical_data: 'Physics Data',
        skills_skill_group_relation: 'Groups Relation',
        skills_skill_owner_conditions: 'Owner Conditions',
        skills_skill_owner_effects: 'Owner Effects'
    }
};

let rawRegisteredEntities = Object.assign({
        animations: SkillAnimationsModel,
        levelAnimations: ClassLevelUpAnimationsModel,
    }, SkillsPackModels
);

let skillsMenu = {
    parentItemLabel: 'Skills',
    icon: 'Fire'
};

let classPathMenu = {
    parentItemLabel: 'Classes & Levels',
    icon: 'DataStructured'
};

let entitiesConfig = {
    skill: SkillEntity.propertiesConfig(skillsMenu),
    skillAttack: SkillAttackEntity.propertiesConfig(skillsMenu),
    skillTargetEffects: SkillTargetEffectsEntity.propertiesConfig(skillsMenu),
    skillPhysicalData: SkillPhysicalDataEntity.propertiesConfig(skillsMenu),
    skillGroups: SkillGroupsEntity.propertiesConfig(skillsMenu),
    skillGroupRelation: SkillGroupRelationEntity.propertiesConfig(skillsMenu),
    skillOwnerConditions: SkillOwnerConditionsEntity.propertiesConfig(skillsMenu),
    skillOwnerEffects: SkillOwnerEffectsEntity.propertiesConfig(skillsMenu),
    classPath: ClassPathEntity.propertiesConfig(classPathMenu),
    level: LevelEntity.propertiesConfig(classPathMenu),
    levelsSet: LevelsSetEntity.propertiesConfig(classPathMenu),
    animations: AnimationsEntity.propertiesConfig(skillsMenu),
    levelAnimations: LevelUpAnimationsEntity.propertiesConfig(classPathMenu),
    classPathLevelLabels: ClassPathLevelLabelEntity.propertiesConfig(classPathMenu),
    classPathLevelSkills: ClassPathLevelSkillsEntity.propertiesConfig(classPathMenu),
    levelModifiers: LevelModifiersEntity.propertiesConfig(classPathMenu),
    ownersClassPath: OwnersClassPathEntity.propertiesConfig(classPathMenu),
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;
