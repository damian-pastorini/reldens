/**
 *
 * Reldens - chat/constants
 *
 */

// @TODO - WIP.
let snippetsPrefix = 'chat.';

let types = {
    KEY: 'ctk',
    MESSAGE: 1,
    JOINED: 2,
    SYSTEM: 3,
    PRIVATE: 4,
    DAMAGE: 5,
    REWARD: 6,
    SKILL: 7,
    TEAMS: 8,
    GLOBAL: 9,
    ERROR: 10
};

module.exports.ChatConst = {
    ROOM_TYPE_CHAT: 'chat',
    CHAT_ACTION: 'c',
    TYPES: types,
    CHAT_FROM: 'f',
    CHAT_TO: 't',
    CHAT_UI: 'chat-ui',
    CHAT_FORM: 'chat-form',
    CHAT_MESSAGES: 'chat-messages',
    CHAT_INPUT: 'chat-input',
    CHAT_SEND_BUTTON: 'chat-send',
    CHAT_CLOSE_BUTTON: 'chat-close',
    CHAT_OPEN_BUTTON: 'chat-open',
    CHAT_BALLOON: 'notification-balloon',
    CHAT_GLOBAL: 'chat',
    MESSAGE: {
        KEY: 'm',
        FROM: 'f',
        TO: 't',
        DATA: {
            KEY: 'md',
            NPC_DAMAGE: 'd',
            TARGET_LABEL: 'tL',
            SNIPPET: 'sp'
        }
    },
    SNIPPETS: {
        NPC_DAMAGE: snippetsPrefix+'npcDamage',
    },
    TYPE_COLOR: {
        [types.MESSAGE]: '#ffffff',
        [types.PRIVATE]: '#f39c12',
        [types.PRIVATE+'.to']: '#00afff',
        [types.GLOBAL]: '#ffff00',
        [types.SYSTEM]: '#2ecc71',
        [types.ERROR]: '#ff0000',
        [types.DAMAGE]: '#ff0000',
        [types.SYSTEM+'.modifiers']: '#0feeff',
        [types.REWARD]: '#2ecc71',
        [types.TEAMS]: '#2ecc71',
    },
    MESSAGES: {
        ON: ' on ',
        HIT_ON: ' hit on ',
        DODGED: ' dodged ',
        REWARD: 'You obtained %dropQuantity %itemLabel',
        WAITING: '...'
    }
};
