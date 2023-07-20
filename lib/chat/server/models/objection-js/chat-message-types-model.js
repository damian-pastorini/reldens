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

}

module.exports.ChatMessageTypesModel = ChatMessageTypesModel;
