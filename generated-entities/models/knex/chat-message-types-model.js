/**
 *
 * Reldens - ChatMessageTypesModel
 *
 */

class ChatMessageTypesModel
{

    static get tableName()
    {
        return 'chat_message_types';
    }

    static get relationMappings()
    {
        return {
            related_chat_message_types: {
                relation: 'BelongsToOneRelation',
                tableName: 'chat_message_types',
                from: 'also_show_in_type',
                to: 'id'
            },
            related_chat: {
                relation: 'HasManyRelation',
                tableName: 'chat',
                from: 'id',
                to: 'message_type'
            }
        };
    }
}

module.exports.ChatMessageTypesModel = ChatMessageTypesModel;
