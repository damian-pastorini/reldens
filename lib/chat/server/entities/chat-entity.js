/**
 *
 * Reldens - ChatEntity
 *
 */

const { EntityProperties } = require('../../../game/server/entity-properties');
const { ChatConst } = require('../../constants');

class ChatEntity extends EntityProperties
{

    static propertiesConfig(extraProps)
    {
        let properties = {
            id: {},
            player_id: {
                type: 'reference',
                reference: 'players',
                isRequired: true
            },
            room_id: {
                type: 'reference',
                reference: 'rooms'
            },
            message: {
                isRequired: true
            },
            private_player_id: {
                type: 'reference',
                reference: 'players'
            },
            message_type: {
                availableValues: [
                    {value: ChatConst.CHAT_SYSTEM, label: 'System'},
                    {value: ChatConst.CHAT_GLOBAL, label: 'Global'},
                    {value: ChatConst.CHAT_MESSAGE, label: 'Message'},
                    {value: ChatConst.CHAT_DAMAGE, label: 'Damage'},
                    {value: ChatConst.CHAT_JOINED, label: 'Joined'},
                    {value: ChatConst.CHAT_PRIVATE, label: 'Private'}
                ],
            },
            message_time: {
                type: 'datetime',
                isRequired: true
            }
        };

        let listPropertiesKeys = Object.keys(properties);
        let editPropertiesKeys = [...listPropertiesKeys];

        editPropertiesKeys.splice(editPropertiesKeys.indexOf('id'), 1);

        return Object.assign({
            listProperties: listPropertiesKeys,
            showProperties: Object.keys(properties),
            filterProperties: listPropertiesKeys,
            editProperties: editPropertiesKeys,
            properties
        }, extraProps);
    }

}

module.exports.ChatEntity = ChatEntity;
