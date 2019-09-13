/**
 *
 * Reldens - UsersModel
 *
 * Users storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');

class UsersModel extends Model
{

    static get tableName()
    {
        return 'users';
    }

    static get relationMappings()
    {
        // to avoid require loop:
        const PlayersModel = require('./players-model');
        return {
            players: {
                relation: Model.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'users.id',
                    to: 'players.user_id'
                }
            }
        };
    }

    $beforeInsert(queryContext)
    {
        let currentDate = new Date().toISOString();
        this.created_at = currentDate;
        this.updated_at = currentDate;
    }

    $beforeUpdate(modelOptions, queryContext)
    {
        this.updated_at = new Date().toISOString();
    }

}

module.exports = UsersModel;
