/**
 *
 * Reldens - snippets/constants
 *
 */

let pref = 'sn.'

module.exports.SnippetsConst = {
    KEY: 'snippets',
    DEFAULT_LOCALE: 'en_US',
    CONCAT_CHARACTER: '.',
    DATA_VALUES_DEFAULT_NAMESPACE: 'default',
    ACTIONS: {
        UPDATE: pref+'Up',
        UPDATE_ERROR: pref+'UpErr'
    },
    SELECTORS: {
        SAVE_ERROR: '.snippets-save-error'
    }
};
