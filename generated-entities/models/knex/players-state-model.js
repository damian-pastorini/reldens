/**
 *
 * Reldens - PlayersStateModel
 *
 */

class PlayersStateModel
{

    static get tableName()
    {
        return 'players_state';
    }

    static get relationMappings()
    {
        return {
            related_players: {
                relation: 'BelongsToOneRelation',
                tableName: 'players',
                from: 'player_id',
                to: 'id'
            },
            related_rooms: {
                relation: 'BelongsToOneRelation',
                tableName: 'rooms',
                from: 'room_id',
                to: 'id'
            }
        };
    }
}

module.exports.PlayersStateModel = PlayersStateModel;
