/**
 *
 * Reldens - ScoresDetailModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ScoresDetailModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'scores_detail';
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

module.exports.ScoresDetailModel = ScoresDetailModel;
