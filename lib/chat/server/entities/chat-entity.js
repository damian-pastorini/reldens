/**
 *
 * Reldens - ChatEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');

class ChatEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            player_id: {
                type: 'reference',
                reference: 'players',
                alias: 'chat_player_id',
                isRequired: true
            },
            room_id: {
                type: 'reference',
                reference: 'rooms',
                alias: 'chat_room'
            },
            message: {
                isRequired: true
            },
            private_player_id: {
                type: 'reference',
                reference: 'players',
                alias: 'chat_private_player_id'
            },
            message_type: {
                type: 'reference',
                reference: 'chat_message_types',
                alias: 'chat_type'
            },
            message_time: {
                type: 'datetime',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return {
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties,
            ...extraProps
        };
    }

}

module.exports.ChatEntity = ChatEntity;
