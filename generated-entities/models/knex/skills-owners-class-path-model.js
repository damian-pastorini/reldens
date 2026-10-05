/**
 *
 * Reldens - SkillsOwnersClassPathModel
 *
 */

class SkillsOwnersClassPathModel
{

    static get tableName()
    {
        return 'skills_owners_class_path';
    }

    static get relationMappings()
    {
        return {
            related_skills_class_path: {
                relation: 'BelongsToOneRelation',
                tableName: 'skills_class_path',
                from: 'class_path_id',
                to: 'id'
            },
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'owner_id',
                to: 'id'
            }
        };
    }
}

module.exports.SkillsOwnersClassPathModel = SkillsOwnersClassPathModel;
