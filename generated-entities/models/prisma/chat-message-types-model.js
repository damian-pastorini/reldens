/**
 *
 * Reldens - ChatMessageTypesModel
 *
 */

class ChatMessageTypesModel
{

    constructor(id, key, show_tab, also_show_in_type)
    {
        this.id = id;
        this.key = key;
        this.show_tab = show_tab;
        this.also_show_in_type = also_show_in_type;
    }

    static get tableName()
    {
        return 'chat_message_types';
    }
    

    static get relationTypes()
    {
        return {
            chat: 'many',
            chat_message_types: 'one',
            other_chat_message_types: 'many'
        };
    }

    static get relationMappings()
    {
        return {
            'related_chat_message_types': 'other_chat_message_types',
            'related_chat': 'chat'
        };
    }
}

module.exports.ChatMessageTypesModel = ChatMessageTypesModel;
