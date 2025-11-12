/**
 *
 * Reldens - AudioModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class AudioModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'audio';
    }
    
    static get relationMappings()
    {
        const { RoomsModel } = require('./rooms-model');
        const { AudioCategoriesModel } = require('./audio-categories-model');
        const { AudioMarkersModel } = require('./audio-markers-model');
        return {
            related_rooms: {
                relation: this.BelongsToOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            },
            related_audio_categories: {
                relation: this.BelongsToOneRelation,
                modelClass: AudioCategoriesModel,
                join: {
                    from: this.tableName+'.category_id',
                    to: AudioCategoriesModel.tableName+'.id'
                }
            },
            related_audio_markers: {
                relation: this.HasManyRelation,
                modelClass: AudioMarkersModel,
                join: {
                    from: this.tableName+'.id',
                    to: AudioMarkersModel.tableName+'.audio_id'
                }
            }
        };
    }
}

module.exports.AudioModel = AudioModel;
