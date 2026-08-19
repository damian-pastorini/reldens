/**
 *
 * Reldens - QuestsProgressModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class QuestsProgressModel
{

    constructor(id, player_id, quest_key, customData)
    {
        this.id = id;
        this.player_id = player_id;
        this.quest_key = quest_key;
        this.customData = customData;
    }

    static createByProps(props)
    {
        return new this(props.id, props.player_id, props.quest_key, props.customData);
    }

}

let schema = new EntitySchema({
    class: QuestsProgressModel,
    tableName: 'quests_progress',
    properties: {
        id: { type: 'number', primary: true },
        player_id: { type: 'number', persist: false, nullable: true },
        quest_key: { type: 'string' },
        customData: { type: 'string', nullable: true },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        }
    }
});
schema._fkMappings = {
    'player_id': {
        relationKey: 'related_players',
        entityName: 'PlayersModel',
        referencedColumn: 'id',
        nullable: true
    }
};

module.exports = {
    QuestsProgressModel,
    entity: QuestsProgressModel,
    schema
};
