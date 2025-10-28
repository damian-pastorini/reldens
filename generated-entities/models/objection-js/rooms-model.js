/**
 *
 * Reldens - RoomsModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class RoomsModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'rooms';
    }
    

    static get relationMappings()
    {
        const { AudioModel } = require('./audio-model');
        const { ChatModel } = require('./chat-model');
        const { ObjectsModel } = require('./objects-model');
        const { PlayersStateModel } = require('./players-state-model');
        const { RoomsChangePointsModel } = require('./rooms-change-points-model');
        const { RoomsReturnPointsModel } = require('./rooms-return-points-model');
        return {
            related_audio: {
                relation: this.HasManyRelation,
                modelClass: AudioModel,
                join: {
                    from: this.tableName+'.id',
                    to: AudioModel.tableName+'.room_id'
                }
            },
            related_chat: {
                relation: this.HasManyRelation,
                modelClass: ChatModel,
                join: {
                    from: this.tableName+'.id',
                    to: ChatModel.tableName+'.room_id'
                }
            },
            related_objects: {
                relation: this.HasManyRelation,
                modelClass: ObjectsModel,
                join: {
                    from: this.tableName+'.id',
                    to: ObjectsModel.tableName+'.room_id'
                }
            },
            related_players_state: {
                relation: this.HasManyRelation,
                modelClass: PlayersStateModel,
                join: {
                    from: this.tableName+'.id',
                    to: PlayersStateModel.tableName+'.room_id'
                }
            },
            related_rooms_change_points: {
                relation: this.HasManyRelation,
                modelClass: RoomsChangePointsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RoomsChangePointsModel.tableName+'.next_room_id'
                }
            },
            related_rooms_return_points: {
                relation: this.HasManyRelation,
                modelClass: RoomsReturnPointsModel,
                join: {
                    from: this.tableName+'.id',
                    to: RoomsReturnPointsModel.tableName+'.from_room_id'
                }
            }
        };
    }
}

module.exports.RoomsModel = RoomsModel;
