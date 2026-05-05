/**
 *
 * Reldens - QuestsProgressModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class QuestsProgressModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'quests_progress';
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

module.exports.QuestsProgressModel = QuestsProgressModel;
