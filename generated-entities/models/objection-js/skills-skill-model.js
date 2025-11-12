/**
 *
 * Reldens - SkillsSkillModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsSkillModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_skill';
    }
    
    static get relationMappings()
    {
        const { SkillsSkillTypeModel } = require('./skills-skill-type-model');
        const { ObjectsSkillsModel } = require('./objects-skills-model');
        const { SkillsClassPathLevelSkillsModel } = require('./skills-class-path-level-skills-model');
        const { SkillsSkillAnimationsModel } = require('./skills-skill-animations-model');
        const { SkillsSkillAttackModel } = require('./skills-skill-attack-model');
        const { SkillsSkillGroupRelationModel } = require('./skills-skill-group-relation-model');
        const { SkillsSkillOwnerConditionsModel } = require('./skills-skill-owner-conditions-model');
        const { SkillsSkillOwnerEffectsModel } = require('./skills-skill-owner-effects-model');
        const { SkillsSkillPhysicalDataModel } = require('./skills-skill-physical-data-model');
        const { SkillsSkillTargetEffectsModel } = require('./skills-skill-target-effects-model');
        return {
            related_skills_skill_type: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsSkillTypeModel,
                join: {
                    from: this.tableName+'.type',
                    to: SkillsSkillTypeModel.tableName+'.id'
                }
            },
            related_objects_skills: {
                relation: this.HasManyRelation,
                modelClass: ObjectsSkillsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsSkillsModel.tableName+'.skill_id'
                }
            },
            related_skills_class_path_level_skills: {
                relation: this.HasManyRelation,
                modelClass: SkillsClassPathLevelSkillsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsClassPathLevelSkillsModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_animations: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillAnimationsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillAnimationsModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_attack: {
                relation: this.HasOneRelation,
                modelClass: SkillsSkillAttackModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillAttackModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_group_relation: {
                relation: this.HasOneRelation,
                modelClass: SkillsSkillGroupRelationModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillGroupRelationModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_owner_conditions: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillOwnerConditionsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillOwnerConditionsModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_owner_effects: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillOwnerEffectsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillOwnerEffectsModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_physical_data: {
                relation: this.HasOneRelation,
                modelClass: SkillsSkillPhysicalDataModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillPhysicalDataModel.tableName+'.skill_id'
                }
            },
            related_skills_skill_target_effects: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillTargetEffectsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillsSkillTargetEffectsModel.tableName+'.skill_id'
                }
            }
        };
    }
}

module.exports.SkillsSkillModel = SkillsSkillModel;
