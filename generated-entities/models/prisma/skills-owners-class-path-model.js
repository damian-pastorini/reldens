/**
 *
 * Reldens - SkillsOwnersClassPathModel
 *
 */

class SkillsOwnersClassPathModel
{

    constructor(id, class_path_id, owner_id, currentLevel, currentExp)
    {
        this.id = id;
        this.class_path_id = class_path_id;
        this.owner_id = owner_id;
        this.currentLevel = currentLevel;
        this.currentExp = currentExp;
    }

    static get tableName()
    {
        return 'skills_owners_class_path';
    }
    

    static get relationTypes()
    {
        return {
            players: 'one',
            skills_class_path: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_skills_class_path': 'skills_class_path',
            'related_players': 'players'
        };
    }
}

module.exports.SkillsOwnersClassPathModel = SkillsOwnersClassPathModel;
