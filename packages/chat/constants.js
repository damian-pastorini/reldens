/**
 *
 * Reldens - chat/constants
 *
 * Chat constants.
 * Here we use shortcuts since these are used for all the communications between server and client.
 *
 */

// constants:
module.exports.ChatConst = {
    CHAT_ACTION: 'c',
    CHAT_MESSAGE: 'm',
    CHAT_FROM: 'f',
    CHAT_TO: 't',
    CHAT_FORM: 'chat-form',
    CHAT_MESSAGES: 'chat-messages',
    CHAT_INPUT: 'chat-input',
    CHAT_SEND_BUTTON: 'chat-send',
    CHAT_CLOSE_BUTTON: 'chat-close',
    CHAT_OPEN_BUTTON: 'chat-open',
    CHAT_BALLOON: 'notification-balloon',
    CHAT_GLOBAL: 'chat',
    CHAT_JOINED: 'j',
    CHAT_SYSTEM: 's',
    CHAT_PRIVATE: 'p',
    CHAT_DAMAGE: 'd',
    CHAT_TYPE_NORMAL: 'ctn',
    CHAT_TYPE_PRIVATE_FROM: 'ctpf',
    CHAT_TYPE_PRIVATE_TO: 'ctpt',
    CHAT_TYPE_GLOBAL: 'ctg',
    CHAT_TYPE_SYSTEM: 'cts',
    CHAT_TYPE_SYSTEM_ERROR: 'ctse',
    colors: {
        ctn: '#ffffff',
        ctpf: '#f39c12',
        ctpt: '#00afff',
        ctg: '#ffff00',
        cts: '#2ecc71',
        ctse: '#ff0000'
    },
    ROOM_TYPE_CHAT: 'chat'
};
