/**
 *
 * Reldens - Skills - SkillModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { SkillConst } = require('@reldens/skills');

class SkillModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return SkillConst.MODELS_PREFIX+'skill';
    }

    static get relationMappings()
    {
        const { SkillOwnerConditionsModel } = require('./skill-owner-conditions-model');
        const { SkillOwnerEffectsModel } = require('./skill-owner-effects-model');
        const { SkillTargetEffectsModel } = require('./skill-target-effects-model');
        const { SkillGroupRelationModel } = require('./skill-group-relation-model');
        const { ClassPathLevelSkillsModel } = require('./class-path-level-skills-model');
        const { SkillAttackModel } = require('./skill-attack-model');
        const { SkillPhysicalDataModel } = require('./skill-physical-data-model');
        return {
            skill_owner_conditions: {
                relation: this.HasManyRelation,
                modelClass: SkillOwnerConditionsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillOwnerConditionsModel.tableName+'.skill_id'
                }
            },
            skill_owner_effects: {
                relation: this.HasManyRelation,
                modelClass: SkillOwnerEffectsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillOwnerEffectsModel.tableName+'.skill_id'
                }
            },
            skill_target_effects: {
                relation: this.HasManyRelation,
                modelClass: SkillTargetEffectsModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillTargetEffectsModel.tableName+'.skill_id'
                }
            },
            skill_group_relations: {
                relation: this.HasManyRelation,
                modelClass: SkillGroupRelationModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillGroupRelationModel.tableName+'.skill_id'
                }
            },
            class_path_level: {
                relation: this.HasManyRelation,
                modelClass: ClassPathLevelSkillsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ClassPathLevelSkillsModel.tableName+'.skill_id'
                }
            },
            skill_attack: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillAttackModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillAttackModel.tableName+'.skill_id'
                }
            },
            skill_physical_data: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillPhysicalDataModel,
                join: {
                    from: this.tableName+'.id',
                    to: SkillPhysicalDataModel.tableName+'.skill_id'
                }
            },
        };
    }

}

module.exports.SkillModel = SkillModel;
