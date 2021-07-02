/**
 *
 * Reldens - AudioModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class AudioModel extends ModelClass
{

    static get tableName()
    {
        return 'audio';
    }

    static get relationMappings()
    {
        const { RoomsModel } = require('../../rooms/server/model');
        const { AudioCategoriesModel } = require('./audio-categories');
        const { AudioMarkersModel } = require('./audio-markers');
        return {
            parent_room: {
                relation: ModelClass.HasOneRelation,
                modelClass: RoomsModel,
                join: {
                    from: this.tableName+'.room_id',
                    to: RoomsModel.tableName+'.id'
                }
            },
            categories: {
                relation: ModelClass.HasOneRelation,
                modelClass: AudioCategoriesModel,
                join: {
                    from: this.tableName+'.category_id',
                    to: AudioCategoriesModel.tableName+'.id'
                }
            },
            markers: {
                relation: ModelClass.HasManyRelation,
                modelClass: AudioMarkersModel,
                join: {
                    from: this.tableName+'.id',
                    to: AudioMarkersModel.tableName+'.audio_id'
                }
            }
        }
    }

    static loadRoomAudios(roomId)
    {
        return this.query()
            .withGraphFetched('[parent_room, categories, markers]')
            .where('room_id', roomId);
    }

    static loadGlobalAudios()
    {
        return this.query()
            .withGraphFetched('[categories, markers]')
            .where('room_id', null);
    }

}

module.exports.AudioModel = AudioModel;