/**
 *
 * Reldens - OperationTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class OperationTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'operation_types';
    }

    static get relationMappings()
    {
        const { ClanLevelsModifiersModel } = require('./clan-levels-modifiers-model');
        const { ItemsItemModifiersModel } = require('./items-item-modifiers-model');
        const { RewardsModifiersModel } = require('./rewards-modifiers-model');
        const { SkillsLevelsModifiersModel } = require('./skills-levels-modifiers-model');
        const { SkillsSkillOwnerEffectsModel } = require('./skills-skill-owner-effects-model');
        const { SkillsSkillTargetEffectsModel } = require('./skills-skill-target-effects-model');
        return {
            related_clan_levels_modifiers: {
                relation: this.HasManyRelation,
                modelClass: ClanLevelsModifiersModel,
                join: {
                    from: this.tableName+'.key',
                    to: ClanLevelsModifiersModel.tableName+'.operation'
                }
            },
            related_items_item_modifiers: {
                relation: this.HasManyRelation,
                modelClass: ItemsItemModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: ItemsItemModifiersModel.tableName+'.operation'
                }
            },
            related_rewards_modifiers: {
                relation: this.HasManyRelation,
                modelClass: RewardsModifiersModel,
                join: {
                    from: this.tableName+'.id',
                    to: RewardsModifiersModel.tableName+'.operation'
                }
            },
            related_skills_levels_modifiers: {
                relation: this.HasManyRelation,
                modelClass: SkillsLevelsModifiersModel,
                join: {
                    from: this.tableName+'.key',
                    to: SkillsLevelsModifiersModel.tableName+'.operation'
                }
            },
            related_skills_skill_owner_effects: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillOwnerEffectsModel,
                join: {
                    from: this.tableName+'.key',
                    to: SkillsSkillOwnerEffectsModel.tableName+'.operation'
                }
            },
            related_skills_skill_target_effects: {
                relation: this.HasManyRelation,
                modelClass: SkillsSkillTargetEffectsModel,
                join: {
                    from: this.tableName+'.key',
                    to: SkillsSkillTargetEffectsModel.tableName+'.operation'
                }
            }
        };
    }
}

module.exports.OperationTypesModel = OperationTypesModel;
