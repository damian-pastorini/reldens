/**
 *
 * Reldens - PlayersStateModel
 *
 */

class PlayersStateModel
{

    constructor(id, player_id, room_id, x, y, dir)
    {
        this.id = id;
        this.player_id = player_id;
        this.room_id = room_id;
        this.x = x;
        this.y = y;
        this.dir = dir;
    }

    static get tableName()
    {
        return 'players_state';
    }
    

    static get relationTypes()
    {
        return {
            players: 'one',
            rooms: 'one'
        };
    }

    static get relationMappings()
    {
        return {
            'related_players': 'players',
            'related_rooms': 'rooms'
        };
    }
}

module.exports.PlayersStateModel = PlayersStateModel;
