/**
 *
 * Reldens - ClanLevelsModel
 *
 */

class ClanLevelsModel
{

    constructor(id, key, label, required_experience)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.required_experience = required_experience;
    }

    static get tableName()
    {
        return 'clan_levels';
    }
    

    static get relationTypes()
    {
        return {
            clan: 'many',
            clan_levels_modifiers: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_clan': 'clan',
            'related_clan_levels_modifiers': 'clan_levels_modifiers'
        };
    }
}

module.exports.ClanLevelsModel = ClanLevelsModel;
