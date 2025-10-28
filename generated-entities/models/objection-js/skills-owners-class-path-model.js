/**
 *
 * Reldens - SkillsOwnersClassPathModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class SkillsOwnersClassPathModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'skills_owners_class_path';
    }
    

    static get relationMappings()
    {
        const { SkillsClassPathModel } = require('./skills-class-path-model');
        const { PlayersModel } = require('./players-model');
        return {
            related_skills_class_path: {
                relation: this.BelongsToOneRelation,
                modelClass: SkillsClassPathModel,
                join: {
                    from: this.tableName+'.class_path_id',
                    to: SkillsClassPathModel.tableName+'.id'
                }
            },
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.owner_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.SkillsOwnersClassPathModel = SkillsOwnersClassPathModel;
