/**
 *
 * Reldens - Entities Config
 *
 */

const { SkillsSkillAnimationsEntityOverride } = require('./entities/skills-skill-animations-entity-override');
const { SkillsClassPathEntityOverride } = require('./entities/skills-class-path-entity-override');
const { SkillsLevelsModifiersEntityOverride } = require('./entities/skills-levels-modifiers-entity-override');
const { SkillsLevelsSetEntityOverride } = require('./entities/skills-levels-set-entity-override');
const { OperationTypesEntityOverride } = require('./entities/operation-types-entity-override');
const { SkillsOwnersClassPathEntityOverride } = require('./entities/skills-owners-class-path-entity-override');
const { SkillsSkillAttackEntityOverride } = require('./entities/skills-skill-attack-entity-override');
const { SkillsSkillEntityOverride } = require('./entities/skills-skill-entity-override');
const { SkillsSkillOwnerEffectsEntityOverride } = require('./entities/skills-skill-owner-effects-entity-override');
const { SkillsSkillTargetEffectsEntityOverride } = require('./entities/skills-skill-target-effects-entity-override');

module.exports.entitiesConfig = {
    skillsSkillAnimations: SkillsSkillAnimationsEntityOverride,
    skillsClassPath: SkillsClassPathEntityOverride,
    skillsLevelsModifiers: SkillsLevelsModifiersEntityOverride,
    skillsLevelsSet: SkillsLevelsSetEntityOverride,
    operationTypes: OperationTypesEntityOverride,
    skillsOwnersClassPath: SkillsOwnersClassPathEntityOverride,
    skillsSkillAttack: SkillsSkillAttackEntityOverride,
    skillsSkill: SkillsSkillEntityOverride,
    skillsSkillOwnerEffects: SkillsSkillOwnerEffectsEntityOverride,
    skillsSkillTargetEffects: SkillsSkillTargetEffectsEntityOverride
};
