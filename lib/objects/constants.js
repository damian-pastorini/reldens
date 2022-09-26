/**
 *
 * Reldens - objects/constants
 *
 * Objects constants.
 *
 */

// constants:
module.exports.ObjectsConst = {
    OBJECT_ANIMATION: 'oa',
    OBJECT_INTERACTION: 'oi',
    TYPE_OBJECT: 'o1',
    TYPE_ANIMATION: 'o2',
    TYPE_NPC: 'o3',
    TYPE_ENEMY: 'o4',
    TYPE_TRADER: 'o5',
    DYNAMIC_ANIMATION: 'dyn',
    DEFAULTS: {
        BASE_OBJECT: {
            CONTENT: '',
            OPTIONS: {},
        },
        NPC_OBJECT: {
            INVALID_MESSAGE: 'I do not understand.'
        },
        TRADER_OBJECT: {
            CONTENT: 'Hi there! What would you like to do?',
            OPTIONS: {
                buy: {label: 'Buy', value: 'buy'},
                sell: {label: 'Sell', value: 'sell'}
            }
        }
    },
    TRADE_ACTIONS: {
        SUB_ACTION: 'sub',
        ADD: 'ta',
        REMOVE: 'tr',
        CONFIRM: 'tc'
    }
};
