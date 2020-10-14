/**
 *
 * Reldens - UsersModel
 *
 * Users storage model, this class will load, add, edit, delete the values in the storage.
 *
 */

const { ModelClass } = require('@reldens/storage');
const { PlayersModel } = require('./players-model');

class UsersModel extends ModelClass
{

    static get tableName()
    {
        return 'users';
    }

    static get relationMappings()
    {
        return {
            players: {
                relation: ModelClass.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: 'users.id',
                    to: 'players.user_id'
                }
            }
        };
    }

    // eslint-disable-next-line no-unused-vars
    $beforeInsert(queryContext)
    {
        let dateFormat = this.getCurrentDate();
        this.created_at = dateFormat;
        this.updated_at = dateFormat;
    }

    // eslint-disable-next-line no-unused-vars
    $beforeUpdate(modelOptions, queryContext)
    {
        this.updated_at = this.getCurrentDate();
    }

    getCurrentDate()
    {
        // get date:
        let date = new Date();
        // format:
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    static loadUserBy(field, value)
    {
        return this.query()
            .withGraphFetched('players.[state, stats]')
            .where(field, value)
            .first()
    }

    static saveUser(userData)
    {
        return this.query()
            .allowInsert('players.[stats, state]')
            .insertGraphAndFetch(userData);
    }

    static updateBy(field, fieldValue, updatePatch)
    {
        return this.query()
            .patch(updatePatch)
            .where(field, fieldValue);
    }

}

module.exports.UsersModel = UsersModel;
