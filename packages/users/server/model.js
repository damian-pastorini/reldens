/**
 *
 * Reldens - UsersModel
 *
 * Users storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { Model } = require('objection');
const { PlayersModel } = require('./players-model');

class UsersModel extends Model
{

    static get tableName()
    {
        return 'users';
    }

    static get relationMappings()
    {
        // to avoid require loop:
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
        let dateFormat = this.getCurrentDate();
        this.created_at = dateFormat;
        this.updated_at = dateFormat;
        super.$beforeInsert(queryContext);
    }

    $beforeUpdate(modelOptions, queryContext)
    {
        this.updated_at = this.getCurrentDate();
        super.$beforeUpdate(modelOptions, queryContext);
    }

    getCurrentDate()
    {
        // get date:
        let date = new Date();
        // format:
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

}

module.exports.UsersModel = UsersModel;
