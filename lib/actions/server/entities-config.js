/**
 *
 * Reldens - Entities Config
 *
 */

const { SkillsSkillAnimationsEntityOverride } = require('./entities/skills-skill-animations-entity-override');
const { SkillsClassPathEntityOverride } = require('./entities/skills-class-path-entity-override');
const { SkillsLevelsModifiersEntityOverride } = require('./entities/skills-levels-modifiers-entity-override');
const { SkillsClassLevelUpAnimationsEntityOverride } = require(
    './entities/skills-class-level-up-animations-entity-override'
);
const { SkillsLevelsSetEntityOverride } = require('./entities/skills-levels-set-entity-override');
const { OperationTypesEntityOverride } = require('./entities/operation-types-entity-override');
const { SkillsOwnersClassPathEntityOverride } = require('./entities/skills-owners-class-path-entity-override');
const { SkillsSkillAttackEntityOverride } = require('./entities/skills-skill-attack-entity-override');
const { SkillsSkillEntityOverride } = require('./entities/skills-skill-entity-override');
const { SkillsSkillGroupRelationEntityOverride } = require('./entities/skills-skill-group-relation-entity-override');
const { SkillsSkillOwnerConditionsEntityOverride } = require('./entities/skills-skill-owner-conditions-entity-override');
const { SkillsSkillOwnerEffectsEntityOverride } = require('./entities/skills-skill-owner-effects-entity-override');
const { SkillsSkillPhysicalDataEntityOverride } = require('./entities/skills-skill-physical-data-entity-override');
const { SkillsSkillTargetEffectsEntityOverride } = require('./entities/skills-skill-target-effects-entity-override');

module.exports.entitiesConfig = {
    skillsSkillAnimations: SkillsSkillAnimationsEntityOverride,
    skillsClassPath: SkillsClassPathEntityOverride,
    skillsLevelsModifiers: SkillsLevelsModifiersEntityOverride,
    skillsClassLevelUpAnimations: SkillsClassLevelUpAnimationsEntityOverride,
    skillsLevelsSet: SkillsLevelsSetEntityOverride,
    operationTypes: OperationTypesEntityOverride,
    skillsOwnersClassPath: SkillsOwnersClassPathEntityOverride,
    skillsSkillAttack: SkillsSkillAttackEntityOverride,
    skillsSkill: SkillsSkillEntityOverride,
    skillsSkillGroupRelation: SkillsSkillGroupRelationEntityOverride,
    skillsSkillOwnerConditions: SkillsSkillOwnerConditionsEntityOverride,
    skillsSkillOwnerEffects: SkillsSkillOwnerEffectsEntityOverride,
    skillsSkillPhysicalData: SkillsSkillPhysicalDataEntityOverride,
    skillsSkillTargetEffects: SkillsSkillTargetEffectsEntityOverride
};
