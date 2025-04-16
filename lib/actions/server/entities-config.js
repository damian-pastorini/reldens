/**
 *
 * Reldens - Entities Config
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
const { SkillTypeEntity } = require('./entities/skill-type-entity');
const { OperationTypesEntity } = require('./entities/operation-types-entity');

let skillsMenu = {
    parentItemLabel: 'Skills',
    icon: 'Fire'
};

let classPathMenu = {
    parentItemLabel: 'Classes & Levels',
    icon: 'DataStructured'
};

let settingsPathMenu = {
    parentItemLabel: 'Settings',
    icon: 'Settings'
};

let usersPathMenu = {
    parentItemLabel: 'Users',
    icon: 'Users'
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
    skillType: SkillTypeEntity.propertiesConfig(skillsMenu),
    classPath: ClassPathEntity.propertiesConfig(classPathMenu),
    level: LevelEntity.propertiesConfig(classPathMenu),
    levelsSet: LevelsSetEntity.propertiesConfig(classPathMenu),
    animations: AnimationsEntity.propertiesConfig(skillsMenu),
    levelAnimations: LevelUpAnimationsEntity.propertiesConfig(classPathMenu),
    classPathLevelLabels: ClassPathLevelLabelEntity.propertiesConfig(classPathMenu),
    classPathLevelSkills: ClassPathLevelSkillsEntity.propertiesConfig(classPathMenu),
    levelModifiers: LevelModifiersEntity.propertiesConfig(classPathMenu),
    ownersClassPath: OwnersClassPathEntity.propertiesConfig(usersPathMenu),
    operationTypes: OperationTypesEntity.propertiesConfig(settingsPathMenu)
};

module.exports.entitiesConfig = entitiesConfig;
