/**
 *
 * Reldens - ChatEntity
 *
 */

const { EntityProperties } = require('@reldens/storage');

class ChatEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {
                isId: true,
                type: 'number',
                isRequired: true,
                dbType: 'int'
            },
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true,
                dbType: 'int'
            },
            room_id: {
                type: 'reference',
                reference: 'rooms',
                dbType: 'int'
            },
            message: {
                isRequired: true,
                dbType: 'varchar'
            },
            private_player_id: {
                type: 'reference',
                reference: 'players',
                dbType: 'int'
            },
            message_type: {
                type: 'reference',
                reference: 'chat_message_types',
                dbType: 'int'
            },
            message_time: {
                type: 'datetime',
                isRequired: true,
                dbType: 'timestamp'
            }
        };
        let propertiesKeys = Object.keys(properties);
        let showProperties = propertiesKeys;
        let editProperties = [...propertiesKeys];
        editProperties.splice(editProperties.indexOf('id'), 1);
        let listProperties = propertiesKeys;
        return {
            showProperties,
            editProperties,
            listProperties,
            filterProperties: listProperties,
            properties,
            ...extraProps
        };
    }

}

module.exports.ChatEntity = ChatEntity;
