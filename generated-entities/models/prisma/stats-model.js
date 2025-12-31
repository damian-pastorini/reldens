/**
 *
 * Reldens - StatsModel
 *
 */

class StatsModel
{

    constructor(id, key, label, description, base_value, customData, created_at, updated_at)
    {
        this.id = id;
        this.key = key;
        this.label = label;
        this.description = description;
        this.base_value = base_value;
        this.customData = customData;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    static get tableName()
    {
        return 'stats';
    }
    

    static get relationTypes()
    {
        return {
            objects_stats: 'many',
            players_stats: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_objects_stats': 'objects_stats',
            'related_players_stats': 'players_stats'
        };
    }
}

module.exports.StatsModel = StatsModel;
