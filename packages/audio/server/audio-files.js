/**
 *
 * Reldens - AudioFilesModel
 *
 */

const { ModelClass } = require('@reldens/storage');

class AudioFilesModel extends ModelClass
{

    static get tableName()
    {
        return 'audio_files';
    }

    static get relationMappings()
    {
        const { AudioModel } = require('./model');
        return {
            parent_audio: {
                relation: ModelClass.HasOneRelation,
                modelClass: AudioModel,
                join: {
                    from: this.tableName+'.audio_id',
                    to: AudioModel.tableName+'.id'
                }
            }
        }
    }

}

module.exports.AudioFilesModel = AudioFilesModel;
