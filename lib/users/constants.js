/**
 *
 * Reldens - UsersConst
 *
 */

let snippetsPrefix = 'users.';

module.exports.UsersConst = {
    ACTION_LIFEBAR_UPDATE: 'alu',
    PLAYER_NAME_INVALID_CHARACTERS: /[^a-zA-Z0-9_.-]/g,
    ORIGINS: {
        REGISTRATION: 'registration',
        GUEST: 'guest',
        FIREBASE: 'firebase',
        ADMIN: 'admin'
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        OPTION_LABEL: snippetsPrefix+'optionLabel',
        SKIN_AD_FAILED: snippetsPrefix+'skinAdFailed'
    },
    MESSAGE: {
        DATA_VALUES: {
            NAMESPACE: 'users'
        }
    },
    SKINS: {
        CONFIG_PATHS: {
            KEYS: 'client/players/skins/keys',
            ADS_KEY: 'server/skins/adsKey',
            AD_TICKET_ITEM_KEY: 'server/skins/adTicketItemKey'
        },
        ACTIONS: {
            AD_START: 'skinAdS'
        },
        EVENTS: {
            AD_REQUESTED: 'reldens.skinAdTicket'
        },
        PRIVATE_DATA: {
            TICKET_RESERVED: 'skinAdTicketReserved'
        },
        AVATAR_KEY_PROPERTY: 'avatarKey',
        SPRITES_BUCKET: '/assets/custom/sprites/'
    }
};
