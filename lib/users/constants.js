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
};
