/**
 *
 * Reldens - ChatMessageTypesModel
 *
 */

const { ObjectionJsRawModel } = require('@reldens/storage');

class ChatMessageTypesModel extends ObjectionJsRawModel
{

    static get tableName()
    {
        return 'chat_message_types';
    }
    

    static get relationMappings()
    {
        const { ChatMessageTypesModel } = require('./chat-message-types-model');
        const { ChatModel } = require('./chat-model');
        return {
            related_chat_message_types: {
                relation: this.BelongsToOneRelation,
                modelClass: ChatMessageTypesModel,
                join: {
                    from: this.tableName+'.also_show_in_type',
                    to: ChatMessageTypesModel.tableName+'.id'
                }
            },
            related_chat: {
                relation: this.HasManyRelation,
                modelClass: ChatModel,
                join: {
                    from: this.tableName+'.id',
                    to: ChatModel.tableName+'.message_type'
                }
            }
        };
    }
}

module.exports.ChatMessageTypesModel = ChatMessageTypesModel;
