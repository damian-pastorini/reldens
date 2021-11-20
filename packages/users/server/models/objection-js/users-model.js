/**
 *
 * Reldens - UsersModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');
const { sc } = require('@reldens/utils');

class UsersModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'users';
    }

    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        return {
            players: {
                relation: this.HasManyRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersModel.tableName+'.user_id'
                }
            }
        };
    }

    // eslint-disable-next-line no-unused-vars
    $beforeInsert(queryContext)
    {
        let dateFormat = sc.getCurrentDate();
        this.created_at = dateFormat;
        this.updated_at = dateFormat;
    }

    // eslint-disable-next-line no-unused-vars
    $beforeUpdate(modelOptions, queryContext)
    {
        this.updated_at = sc.getCurrentDate();
    }

}

module.exports.UsersModel = UsersModel;
