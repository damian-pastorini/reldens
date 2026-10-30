/**
 *
 * Reldens - UsersConst
 *
 */

let snippetsPrefix = 'users.';

module.exports.UsersConst = {
    ACTION_LIFEBAR_UPDATE: 'alu',
    ORIGINS: {
        REGISTRATION: 'registration',
        GUEST: 'guest',
        FIREBASE: 'firebase',
        ADMIN: 'admin'
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        OPTION_LABEL: snippetsPrefix+'optionLabel'
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
        AVATAR_KEY_PROPERTY: 'avatarKey',
        SPRITES_BUCKET: '/assets/custom/sprites/'
    }
};
