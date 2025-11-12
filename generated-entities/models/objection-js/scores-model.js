/**
 *
 * Reldens - ScoresModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ScoresModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'scores';
    }
    
    static get relationMappings()
    {
        const { PlayersModel } = require('./players-model');
        return {
            related_players: {
                relation: this.BelongsToOneRelation,
                modelClass: PlayersModel,
                join: {
                    from: this.tableName+'.player_id',
                    to: PlayersModel.tableName+'.id'
                }
            }
        };
    }
}

module.exports.ScoresModel = ScoresModel;
