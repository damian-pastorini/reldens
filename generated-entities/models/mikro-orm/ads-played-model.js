/**
 *
 * Reldens - AdsPlayedModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class AdsPlayedModel
{

    constructor(id, ads_id, player_id, started_at, ended_at)
    {
        this.id = id;
        this.ads_id = ads_id;
        this.player_id = player_id;
        this.started_at = started_at;
        this.ended_at = ended_at;
    }

    static createByProps(props)
    {
        const {id, ads_id, player_id, started_at, ended_at} = props;
        return new this(id, ads_id, player_id, started_at, ended_at);
    }
    
}

const schema = new EntitySchema({
    class: AdsPlayedModel,
    tableName: 'ads_played',
    properties: {
        id: { type: 'number', primary: true },
        ads_id: { type: 'number', persist: false },
        player_id: { type: 'number', persist: false },
        started_at: { type: 'Date', nullable: true },
        ended_at: { type: 'Date', nullable: true },
        related_ads: {
            kind: 'm:1',
            entity: 'AdsModel',
            joinColumn: 'ads_id'
        },
        related_players: {
            kind: 'm:1',
            entity: 'PlayersModel',
            joinColumn: 'player_id'
        }
    },
});
schema._fkMappings = {
    "ads_id": {
        "relationKey": "related_ads",
        "entityName": "AdsModel",
        "referencedColumn": "id",
        "nullable": false
    },
    "player_id": {
        "relationKey": "related_players",
        "entityName": "PlayersModel",
        "referencedColumn": "id",
        "nullable": false
    }
};
module.exports = {
    AdsPlayedModel,
    entity: AdsPlayedModel,
    schema: schema
};
