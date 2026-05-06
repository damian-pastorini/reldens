/**
 *
 * Reldens - QuestsProgressModel
 *
 */

class QuestsProgressModel
{

    constructor(id, player_id, quest_key, customData)
    {
        this.id = id;
        this.player_id = player_id;
        this.quest_key = quest_key;
        this.customData = customData;
    }

    static get tableName()
    {
        return 'quests_progress';
    }
    
}

module.exports.QuestsProgressModel = QuestsProgressModel;
