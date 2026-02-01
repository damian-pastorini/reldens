/**
 *
 * Reldens - ChatMessageTypesModel
 *
 */

const { MikroOrmCore } = require('@reldens/storage');
const { EntitySchema } = MikroOrmCore;

class ChatMessageTypesModel
{

    constructor(id, key, show_tab, also_show_in_type)
    {
        this.id = id;
        this.key = key;
        this.show_tab = show_tab;
        this.also_show_in_type = also_show_in_type;
    }

    static createByProps(props)
    {
        const {id, key, show_tab, also_show_in_type} = props;
        return new this(id, key, show_tab, also_show_in_type);
    }
    
}

const schema = new EntitySchema({
    class: ChatMessageTypesModel,
    tableName: 'chat_message_types',
    properties: {
        id: { type: 'number', primary: true },
        key: { type: 'string' },
        show_tab: { type: 'number', nullable: true },
        also_show_in_type: { type: 'number', persist: false },
        related_chat_message_types: {
            kind: 'm:1',
            entity: 'ChatMessageTypesModel',
            joinColumn: 'also_show_in_type'
        },
        related_chat: {
            kind: '1:m',
            entity: 'ChatModel',
            mappedBy: 'related_chat_message_types'
        }
    },
});
schema._fkMappings = {
    "also_show_in_type": {
        "relationKey": "related_chat_message_types",
        "entityName": "ChatMessageTypesModel",
        "referencedColumn": "id",
        "nullable": true
    }
};
module.exports = {
    ChatMessageTypesModel,
    entity: ChatMessageTypesModel,
    schema: schema
};
